import { readFileSync } from 'node:fs'

const commitMsgFilePath = process.argv[2]

if (!commitMsgFilePath) {
  console.error('Missing commit message file path.')
  process.exit(1)
}

const commitMessage = readFileSync(commitMsgFilePath, 'utf8')
  .split('\n')
  .map(line => line.trim())
  .find(line => line.length > 0 && !line.startsWith('#'))

if (!commitMessage) {
  console.error('Commit message cannot be empty.')
  process.exit(1)
}

const ignoredPatterns = [/^Merge /, /^Revert "/]
if (ignoredPatterns.some(pattern => pattern.test(commitMessage))) {
  process.exit(0)
}

const conventionalPattern =
  /^(revert:\s)?(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\([^)]+\))?!?: .+/

if (!conventionalPattern.test(commitMessage)) {
  console.error('Invalid commit message format.')
  console.error('Expected: type(scope): subject')
  console.error('Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore')
  console.error(`Received: ${commitMessage}`)
  process.exit(1)
}
