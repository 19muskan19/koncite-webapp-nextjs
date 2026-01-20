<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1H8Hktf2BcVhVSQAv_v9ustPX65sw_2sP

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root and add your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   **To get your Gemini API key:**
   - Visit https://aistudio.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the generated key and paste it in your `.env.local` file

3. Run the app:
   ```bash
   npm run dev
   ```

**Note:** The `.env.local` file is already in `.gitignore` and won't be committed to version control. Make sure to create this file manually as it's required for the AI features to work.
