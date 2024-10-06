# Anzid MTG Scoreboard

This is a simple Node.js-based scoreboard application that displays and controls match scores in real-time. It features
a **control interface**, **scoreboard display**, and a newly added **master control** page that allows uploading custom
overlay images for the scoreboards.

## Installation

### Prerequisites

- Install [Node.js](https://nodejs.org/en/download/) for Windows (v16.20.2 recommended, but any Node.js 16.x version
  should work).
- Verify your Node.js installation by running:
  ```bash
  node -v
  ```

## Steps

### 1. Clone the repository

```bash
git clone https://github.com/your-username/anzid_mtg_scoreboard.git
```

### 2. Navigate to the project directory

```bash
cd anzid_mtg_scoreboard
```

### 3. Install dependencies (if applicable)

If the project has dependencies, you should install them using:

```bash
npm install
```

### 4. Run the server

```bash
node server.js
```

## Usage

### Control Interface

To control a match scoreboard, open the control interface by accessing the following URL:

```
http://localhost:5000/control/<match-name>/<delay>
```

`<match-name>`: The name of the match (e.g., `match1`).  
`<delay>`: The delay in microseconds (e.g., `10`).

Example:

```
http://localhost:5000/control/match1/10
```

### Scoreboard Display

To view the scoreboard for a specific match, open the following URL:

```
http://localhost:5000/scoreboard/<match-name>
```

`<match-name>`: The name of the match you want to display (e.g., `match1`).

Example:

```
http://localhost:5000/scoreboard/match1
```

### Master Control Interface (New)

The **Master Control** page allows you to upload a custom overlay background image for all the scoreboards and provides
a preview of the currently set overlay.

To access the Master Control interface, open the following URL:

```
http://localhost:5000/master-control
```

### Master Control Features

1. **View Currently Set Overlay**: The Master Control page displays the currently set overlay background for the
   scoreboards.
2. **Upload New Overlay**: You can upload a new 1920x1080 overlay image to use as the background for all the scoreboards.
3. **Preview Image Before Upload**: A preview of the selected image is shown before uploading it.
4. **Cancel Image Upload**: If you've selected an image but want to cancel the upload, you can use the "Cancel Upload"
   button.

#### Example Workflow:

- Access the Master Control page:
  ```
  http://localhost:5000/master-control
  ```

- Upload a new overlay image:
    - Select a 1920x1080 image file.
    - Preview the image.
    - Click "Upload" to set the new overlay background for all scoreboards.

- Cancel an image upload if you've changed your mind by clicking the **Cancel Upload** button.

---

### Additional Information

- Ensure that port `5000` is available and not used by other services when running the server.
- For any issues or contributions, please open a GitHub issue or pull request.
