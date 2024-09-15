# Anzid MTG Scoreboard

This is a simple Node.js-based scoreboard application that displays and controls match scores in real-time. It features a control interface and a scoreboard display, with customizable match names and delays.

## Installation

### Prerequisites
- Install [Node.js](https://nodejs.org/en/download/) for Windows (v16.20.2 recommended, but any Node.js 16.x version should work).
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

### 3. Run the server
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
