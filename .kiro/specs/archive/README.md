# Archived Kiro Specs

This directory contains completed Kiro specs that have been successfully implemented and archived for historical reference.

## Archived Specs

### 1. ChatGPT Web Modernization

**Status**: ✅ Completed  
**Date**: 2025-2026  
**Description**: Comprehensive modernization of the ChatGPT Web application including monorepo migration, technology upgrades, and architecture improvements.

**Key Achievements**:

- Migrated to PNPM workspace + Turborepo monorepo
- Upgraded to Node.js 24+ with native HTTP/2
- Implemented modern development workflow
- Enhanced code quality standards

**Related Reports**:

- `docs/archive/reports/2026-02-20-monorepo-migration-complete.md`

---

### 2. Express to Native Routing Migration

**Status**: ✅ Completed  
**Date**: March 9, 2026  
**Description**: Migration from Express.js framework to native Node.js HTTP/2 server with framework-agnostic Transport Layer abstraction.

**Key Achievements**:

- Removed all Express dependencies
- Implemented native HTTP/2 server with HTTP/1.1 fallback
- Created Transport Layer abstractions
- Implemented native middleware (auth, rate limiting, CORS, etc.)
- Achieved 100% API compatibility
- All 734 tests passing

**Related Reports**:

- `docs/archive/reports/express-migration-validation-report.md`
- `docs/archive/guides/express-to-native-migration.md`

---

### 3. Remove Unofficial Proxy API

**Status**: ✅ Completed  
**Date**: 2025-2026  
**Description**: Removed unofficial ChatGPT proxy API support and migrated to official OpenAI and Azure OpenAI APIs only.

**Key Achievements**:

- Removed unofficial `chatgpt` npm package
- Migrated to Vercel AI SDK (ai package)
- Implemented @ai-sdk/openai and @ai-sdk/azure providers
- Enhanced security and reliability
- Improved API compatibility

**Related Reports**:

- `docs/archive/reports/2026-03-10-ai-sdk-ui-migration.md`

---

## Archive Policy

Specs are archived when:

1. ✅ All tasks completed
2. ✅ Implementation validated and tested
3. ✅ Documentation updated
4. ✅ Migration reports created
5. ✅ No active development needed

## Accessing Archived Specs

Each archived spec directory contains:

- `requirements.md` - Original requirements and goals
- `design.md` - Design decisions and architecture
- `tasks.md` - Task breakdown and completion status

## Related Documentation

For current project documentation, see:

- Main documentation: `packages/docs/`
- Archive reports: `docs/archive/reports/`
- Archive guides: `docs/archive/guides/`

---

**Last Updated**: March 10, 2026
