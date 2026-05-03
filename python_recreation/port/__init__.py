# Modular package — all logic lives in ULTRAMAIN.py for a true 1:1 port.
# These submodules re-export pieces so you can `from port.weapons import WEAPONS` etc.
import os, sys
_here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _here not in sys.path: sys.path.insert(0, _here)
import ULTRAMAIN as _u
__all__ = ["_u"]
