#!/usr/bin/env bash
# Upload the static site to its S3 bucket and invalidate the CloudFront cache.
#
# The bucket and distribution come from the outputs of the "ilc" CloudFormation stack (us-west-2),
# which the server repo's template.yaml defines. The AWS credentials need cloudformation:DescribeStacks
# on that stack, s3:ListBucket, s3:PutObject and s3:DeleteObject on the bucket, and
# cloudfront:CreateInvalidation on the distribution. CI uses the ilc-client-deploy role.
#
# Usage:
#   ./deploy.sh                 build with pnpm, then upload
#   SKIP_BUILD=1 ./deploy.sh    upload the existing build/
set -euo pipefail

stack=ilc
region=us-west-2

cd "$(dirname "$0")"

outputs="$(
	aws cloudformation describe-stacks --stack-name "$stack" --region "$region" --output text \
		--query "[Stacks[0].Outputs[?OutputKey=='SiteBucketName'].OutputValue | [0], Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue | [0]]"
)"
read -r bucket distribution_id <<<"$outputs"
if [[ -z "$bucket" || "$bucket" == None || -z "$distribution_id" || "$distribution_id" == None ]]; then
	echo "deploy.sh: stack $stack has no SiteBucketName or DistributionId output" >&2
	exit 1
fi

if [[ "${SKIP_BUILD:-}" != 1 ]]; then
	pnpm build
fi
if [[ ! -f build/index.html || ! -d build/_app/immutable ]]; then
	echo "deploy.sh: build/ is missing or incomplete; run pnpm build" >&2
	exit 1
fi

echo "Deploying build/ to s3://$bucket (CloudFront distribution $distribution_id)"

# 1. JS and CSS whose file names contain a content hash, so they can be cached forever. Upload them
#    first, so the new pages never reference a missing file. Never delete them: a page loaded before
#    this deploy may still request its old chunks.
aws s3 sync build/_app/immutable "s3://$bucket/_app/immutable" --region "$region" --no-progress \
	--cache-control "public,max-age=31536000,immutable"

# 2. Everything else: the HTML pages, _app/version.json (which SvelteKit fetches to detect a new
#    deploy) and the files from static/ (favicons, robots.txt). None of these have a content hash in
#    their names, so browsers must revalidate them on every use ("no-cache") or they could keep an
#    old copy after a deploy. That includes the favicons and robots.txt: a revalidation is a 304
#    without a body, and at this site's traffic a longer max-age would save nothing worth the risk
#    of stale files. Copy rather than sync: sync skips a file whose size matches the bucket's copy
#    unless the local file is newer, and the pages of another build usually have the same size
#    (only same-length hashes change), so SKIP_BUILD=1 with an older build/, such as a rollback by
#    hand, would silently keep the newer pages.
aws s3 cp build "s3://$bucket" --recursive --region "$region" --no-progress \
	--exclude "_app/immutable/*" --cache-control "no-cache"

# 3. Delete pages and files that are no longer in the build. The bucket's copies are now newer than
#    build/, so this sync normally uploads nothing, and its --exclude keeps it out of _app/immutable.
aws s3 sync build "s3://$bucket" --region "$region" --no-progress --delete \
	--exclude "_app/immutable/*" --cache-control "no-cache"

# 4. Drop CloudFront's cached copies so the new pages are served right away.
invalidation_id="$(
	aws cloudfront create-invalidation --distribution-id "$distribution_id" --paths "/*" \
		--query Invalidation.Id --output text
)"
echo "Created CloudFront invalidation $invalidation_id"
