import os
import sys
import warnings

class SuppressOutput:
    def __enter__(self):
        # Save the original stdout and stderr
        self._original_stdout = sys.stdout
        self._original_stderr = sys.stderr
        # Redirect to devnull
        self._devnull = open(os.devnull, 'w')
        sys.stdout = self._devnull
        sys.stderr = self._devnull
        warnings.filterwarnings('ignore')
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Restore original stdout and stderr
        sys.stdout = self._original_stdout
        sys.stderr = self._original_stderr
        self._devnull.close()