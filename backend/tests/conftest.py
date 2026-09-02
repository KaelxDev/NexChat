def pytest_terminal_summary(terminalreporter):
    for report in terminalreporter.getreports("failed"):
        details = " ".join(str(report.longrepr).split())
        if details:
            print(f"::error title=pytest failure::{details[:1000]}")
