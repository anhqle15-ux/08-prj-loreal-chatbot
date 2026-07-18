# Project 8: L'Oréal Chatbot

L’Oréal is exploring the power of AI, and your job is to showcase what's possible. Your task is to build a chatbot that helps users discover and understand L’Oréal’s extensive range of products—makeup, skincare, haircare, and fragrances—as well as provide personalized routines and recommendations.

## 🚀 Launch locally

1. Open the repository folder in a browser or use a simple static server.
2. The site uses relative paths, so it can open directly from GitHub Pages without a local server.

## ☁️ Cloudflare Worker setup

1. Deploy the code from [RESOURCE_cloudflare-worker.js](RESOURCE_cloudflare-worker.js) to a Cloudflare Worker.
2. Add an environment secret named OPENAI_API_KEY in the Cloudflare dashboard.
3. Update the WORKER_URL constant in [script.js](script.js) to your deployed Worker URL.
4. The frontend sends a messages array to the Worker; the Worker holds the OpenAI API key securely and returns the OpenAI response.

## 🌐 GitHub Pages deployment

- Deploy the repository contents as a static site from GitHub Pages.
- Keep all asset paths relative, including [index.html](index.html), [style.css](style.css), and the logo in [img/loreal-logo.png](img/loreal-logo.png).
- The chatbot will work once the Worker URL is configured.

Enjoy building your L’Oréal beauty assistant! 💄
