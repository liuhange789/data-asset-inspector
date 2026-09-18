# @liuhange/dsh-data-asset-shared

Shared infrastructure for data assetization plugins.

## Modules

- **BusinessRulesLoader**: Loads `config/business-rules.json` with 5-level config degradation (CONFIG_LOADED / DEFAULT_MISSING / DEFAULT_PARSE / DEFAULT_VERSION / DEFAULT_PARTIAL)
- **FileFormatAdapter**: Reads/writes CSV, JSON, TXT, XLSX formats with unknown-format degradation to TXT
- **ReportGenerator**: Generates masking, cleaning, inventory, and packaging reports per spec 6.3-6.6
- **PathValidator**: Validates file paths against working directory, prevents path traversal attacks
- **AuditLogger**: Logs processing operations with `[pluginName] message` format

## Usage

```typescript
import { BusinessRulesLoader, FileFormatAdapter, ReportGenerator, PathValidator, AuditLogger } from '@liuhange/dsh-data-asset-shared'

const loader = new BusinessRulesLoader()
const { config, status } = loader.load()
```

## Known Limitations and Deferred Work

- XLSX format support is limited to text-based line reading; full binary XLSX parsing requires the `xlsx` library
- Large file streaming (>10MB) is detected but not yet implemented with stream APIs