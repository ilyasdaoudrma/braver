"""Smoke test: the ML environment has what D1/M1/D2/M2/E1 need."""
import sys


def test_python_version():
    assert sys.version_info >= (3, 11)


def test_ml_packages_import():
    import datasets  # noqa: F401
    import matplotlib  # noqa: F401
    import pandas  # noqa: F401
    import requests  # noqa: F401
    import sklearn  # noqa: F401
