# Deploying S4 Ledger Metrics API

## Local Deployment
1. Install dependencies:
   ```bash
   pip install flask xrpl-py
   ```
2. Run the API server:
   ```bash
   python metrics_api.py
   ```
   The API will be available at http://localhost:5050/metrics

## Cloud Hosting (Recommended)
- Use platforms like Heroku, AWS Lambda, Google Cloud Run, or Azure App Service.
- Example: Heroku
  1. Create a Heroku account and install Heroku CLI.
  2. In your project folder:
     ```bash
     heroku create s4-ledger-metrics-api
     git push heroku main
     ```
  3. Set up Procfile:
     ```
     web: python metrics_api.py
     ```
  4. Your API will be live at https://s4-ledger-metrics-api.herokuapp.com/metrics

- For AWS, GCP, or Azure, follow their Python/Flask deployment guides.

## Frontend Integration
- Update metrics.html to fetch from your cloud API endpoint (replace localhost with your deployed URL).

## Security Note
- Restrict API access if needed (e.g., API keys, CORS).
- No sensitive data is exposed — only aggregate metrics.

For help, contact info@s4ledger.com.