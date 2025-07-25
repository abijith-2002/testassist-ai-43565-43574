# Lightweight React Template for KAVIA

This project provides a minimal React template with a clean, modern UI and minimal dependencies.

## Features

- **Lightweight**: No heavy UI frameworks - uses only vanilla CSS and React
- **Modern UI**: Clean, responsive design with KAVIA brand styling
- **Fast**: Minimal dependencies for quick loading times
- **Simple**: Easy to understand and modify

## Getting Started

In the project directory, you can run:

### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### API Backend URL Configuration

Chat API requests are sent to the backend server `/chat` endpoint.
You **must** configure the API base URL via the environment variable `REACT_APP_API_BASE_URL` if the backend is not running on the same host/port (e.g., cloud or Docker deployment).

**Recommended Production/Cloud:**
- The default for non-localhost deployments (such as preview and production) is:
  ```
  https://vscode-internal-382-beta.beta01.cloud.kavia.ai:3001
  ```
- The React UI POSTs chat requests to `${REACT_APP_API_BASE_URL}/chat`.
- To override the endpoint target, launch with:
  ```bash
  REACT_APP_API_BASE_URL=https://vscode-internal-382-beta.beta01.cloud.kavia.ai:3001 npm start
  ```
  or set in `.env` file:
  ```
  REACT_APP_API_BASE_URL=https://vscode-internal-382-beta.beta01.cloud.kavia.ai:3001
  ```

**Local development:**
- On `localhost`, the frontend defaults to `http://localhost:3001` for backend API calls.
- (You can still override with `REACT_APP_BACKEND_API_URL` if needed.)

**Error handling:**  
- If the backend returns an error (including 404 or 5xx), or responds with an error message, the error will be clearly shown at the top of the chat UI for the user.
- If the backend cannot be reached (bad base URL/CORS/network), a friendly error is also surfaced.

### Robust Error Handling

- If the backend response is not OK (`!resp.ok`), all error responses (including HTTP 404s and FastAPI/Gemini error objects) are parsed and surfaced to users within the chat area.
- Network or CORS failures will also show a detailed, user-friendly error.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

## Customization

### Colors

The main brand colors are defined as CSS variables in `src/App.css`:

```css
:root {
  --kavia-orange: #E87A41;
  --kavia-dark: #1A1A1A;
  --text-color: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --border-color: rgba(255, 255, 255, 0.1);
}
```

### Components

This template uses pure HTML/CSS components instead of a UI framework. You can find component styles in `src/App.css`. 

Common components include:
- Buttons (`.btn`, `.btn-large`)
- Container (`.container`)
- Navigation (`.navbar`)
- Typography (`.title`, `.subtitle`, `.description`)

## Learn More

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
