"""Test-only provider isolation; application behavior is unchanged."""
from django.test.runner import DiscoverRunner
from unittest.mock import patch

class LocalProviderTestRunner(DiscoverRunner):
    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)
        self._mail = patch('resend.Emails.send', return_value={'id':'local-test-only'})
        self._mail.start()

    def teardown_test_environment(self, **kwargs):
        self._mail.stop()
        super().teardown_test_environment(**kwargs)
