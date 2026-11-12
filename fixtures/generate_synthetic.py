"""
Generates synthetic OneNote MS-ONESTORE header files for cleanroom testing
"""
import os
import struct

ONE_SECTION_GUID = bytes([
    0xE4, 0x52, 0x5C, 0x7B, 0x8C, 0xD8, 0xA7, 0x4D, 0xAE, 0xB1, 0x53, 0x78, 0xD0, 0x29, 0x96, 0xD3
])
ONETOC2_GUID = bytes([
    0xA1, 0x2F, 0xFF, 0x43, 0xD9, 0xEF, 0x76, 0x4C, 0x9E, 0xE2, 0x10, 0xEA, 0x57, 0x22, 0x76, 0x5F
])

def create_synthetic_section(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    header = bytearray(1024)
    header[0:16] = ONE_SECTION_GUID
    header[64:68] = struct.pack('<I', 42) # Version 0x2A
    header[88:92] = struct.pack('<I', 1)  # 1 transaction
    with open(path, 'wb') as f:
        f.write(header)

def create_synthetic_toc(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    header = bytearray(1024)
    header[0:16] = ONETOC2_GUID
    header[64:68] = struct.pack('<I', 27) # Version 0x1B
    with open(path, 'wb') as f:
        f.write(header)

if __name__ == '__main__':
    create_synthetic_section('fixtures/synthetic/Section1.one')
    create_synthetic_toc('fixtures/synthetic/Open Notebook.onetoc2')
    print("Created synthetic fixtures in fixtures/synthetic/")
