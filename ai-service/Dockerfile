FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ⬇️ Trust the Cisco Secure Access root CA (fixes TLS interception)
COPY cisco-ca.crt /usr/local/share/ca-certificates/cisco-ca.crt
RUN update-ca-certificates

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

# Point Python/httpx at the system bundle (now includes Cisco root)
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

EXPOSE 3001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "3001"]