# Legal and Compliance Notice

## 1. Microsoft Open Specifications Promise
Microsoft publishes the OneNote file formats under Open Specifications:
- **[MS-ONESTORE]**: OneNote Revision Store File Format
- **[MS-ONE]**: OneNote File Format
- **[MS-FSSHTTPB]** / **[MS-FSSHTTP]**: Binary packaging protocols

Per Microsoft's Open Specifications Promise and Community Promise, implementers are granted non-exclusive, royalty-free, perpetual patent covenants and rights to implement and distribute implementations derived from these technical specifications.

Inkpage implements file format parsers strictly based on public documentation and cleanroom behavioral testing without decompilation or disassembly of Microsoft binaries.

## 2. Trademarks
- "OneNote", "Microsoft", "Windows", and "OneDrive" are registered trademarks of Microsoft Corporation.
- References to Microsoft OneNote in this software and documentation are purely nominative to describe file compatibility ("imports files created by Microsoft OneNote").
- Inkpage is an independent open-source project and is not affiliated with, endorsed by, or sponsored by Microsoft Corporation.

## 3. Privacy and Data Security
- All note importing and processing occurs locally on the user's computer.
- No telemetry, analytics, or background telemetry services are included.
- Any OAuth tokens (e.g. for Microsoft Graph delegated read imports) are stored securely in the system keyring and are never transmitted elsewhere.
