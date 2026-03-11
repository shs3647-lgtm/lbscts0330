import ctypes
import os

# Extended path to bypass Windows reserved name protection
path = "\\\\?\\C:\\fmea-onpremise\\nul"
print(f"Attempting to delete: {path}")
print(f"Path repr: {repr(path)}")

# Try DeleteFileW
result = ctypes.windll.kernel32.DeleteFileW(path)
err = ctypes.windll.kernel32.GetLastError()
print(f"DeleteFileW result={result}, error={err}")

if result == 0:
    # Error 2 = file not found, 3 = path not found
    # Try RemoveDirectoryW
    result2 = ctypes.windll.kernel32.RemoveDirectoryW(path)
    err2 = ctypes.windll.kernel32.GetLastError()
    print(f"RemoveDirectoryW result={result2}, error={err2}")

# Verify
exists = os.path.exists("C:\\fmea-onpremise\\nul")
print(f"File still exists: {exists}")
