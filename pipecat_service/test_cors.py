import unittest

from fastapi.testclient import TestClient

from server import app


class PipecatCorsTest(unittest.TestCase):
    def test_allows_vite_fallback_localhost_port(self):
        client = TestClient(app)

        response = client.get("/health", headers={"Origin": "http://127.0.0.1:5175"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:5175")


if __name__ == "__main__":
    unittest.main()
