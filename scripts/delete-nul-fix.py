import ctypes
import os

# Method 1: Try extended path with raw string
path = r'\\?\C:\fmea-onpremise\nul'
print(f'Method 1 - Extended path: {repr(path)}')
attrs = ctypes.windll.kernel32.GetFileAttributesW(path)
print(f'  GetFileAttributes: {attrs}')
if attrs != 0xFFFFFFFF and attrs != -1:
    ret = ctypes.windll.kernel32.DeleteFileW(path)
    err = ctypes.windll.kernel32.GetLastError()
    print(f'  DeleteFileW: ret={ret}, error={err}')

# Method 2: Try short path
path2 = r'\\?\C:\fmea-o~1\nul'
print(f'Method 2 - Short path: {repr(path2)}')
attrs2 = ctypes.windll.kernel32.GetFileAttributesW(path2)
print(f'  GetFileAttributes: {attrs2}')

# Method 3: Scan directory for actual file
print('\nMethod 3 - Scanning directory:')
try:
    for entry in os.scandir(r'C:\fmea-onpremise'):
        if entry.name.lower() == 'nul':
            print(f'  FOUND: {entry.name} (is_file={entry.is_file()}, is_dir={entry.is_dir()})')
            # Try to remove via os
            try:
                os.remove(entry.path)
                print('  DELETED via os.remove!')
            except Exception as e:
                print(f'  os.remove failed: {e}')
                # Try via extended path
                ext_path = r'\\?' + '\\' + os.path.abspath(entry.path)
                print(f'  Trying extended: {repr(ext_path)}')
                ret = ctypes.windll.kernel32.DeleteFileW(ext_path)
                print(f'  DeleteFileW: ret={ret}')
except Exception as e:
    print(f'  Scan error: {e}')

# Method 4: Use FindFirstFile to check
print('\nMethod 4 - FindFirstFile check:')
import ctypes.wintypes as wt

class WIN32_FIND_DATA(ctypes.Structure):
    _fields_ = [
        ("dwFileAttributes", wt.DWORD),
        ("ftCreationTime", wt.FILETIME),
        ("ftLastAccessTime", wt.FILETIME),
        ("ftLastWriteTime", wt.FILETIME),
        ("nFileSizeHigh", wt.DWORD),
        ("nFileSizeLow", wt.DWORD),
        ("dwReserved0", wt.DWORD),
        ("dwReserved1", wt.DWORD),
        ("cFileName", ctypes.c_wchar * 260),
        ("cAlternateFileName", ctypes.c_wchar * 14),
    ]

fd = WIN32_FIND_DATA()
handle = ctypes.windll.kernel32.FindFirstFileW(r'C:\fmea-onpremise\nul', ctypes.byref(fd))
if handle != -1:
    print(f'  Found: {fd.cFileName}, attrs={fd.dwFileAttributes}, size={fd.nFileSizeLow}')
    ctypes.windll.kernel32.FindClose(handle)
else:
    err = ctypes.windll.kernel32.GetLastError()
    print(f'  Not found via FindFirstFile (error={err})')
    print('  nul is a virtual Windows device, not a real file')
    print('  Need to find another solution for Turbopack...')
