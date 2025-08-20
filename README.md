# WebCrawler

[Try WebCrawler Online](https://ende25.github.io/WebCrawler/)

<img width="1862" height="971" alt="image" src="https://github.com/user-attachments/assets/8e973b44-7c95-420c-869d-593f0211b309" />

## Application Overview
WebCrawler is a visually modern, dark-themed web application for mapping and exploring the structure of any website. It is especially useful for OSINT (Open Source Intelligence) tasks, allowing you to:
- Input a website URL and map its internal and external links.
- Visualize the site structure as an interactive, real-time graph.
- Distinguish between internal, external, and direct child nodes with clear color coding.
- Export the discovered map to JSON.
- Expand any node on demand for step-by-step exploration.

## Usage Modes
### 1. Full Mapping Mode
- Enter the desired website URL in the input field.
- Set the maximum node count (depth) for the scan. For a broad overview, use a higher value (e.g., 10 or more).
- Click **Start Mapping** to begin. The app will crawl and visualize the site up to the specified depth.
- To start a new mapping, you must first click **Stop** to reset the state.
- You can export the current map at any time using **Export Map**.

### 2. Concrete/Step-by-Step Mapping (Node Expansion)
- Recommended for navigation-like exploration or when you want to expand the site gradually.
- Set the depth to a low value (e.g., 2) for best results.
- After the initial mapping, select any node in the graph.
- Use the **Expand Selected** button (bottom right) to expand only the selected node one level further, revealing its direct children.
- Repeat as needed to explore the site structure step by step.

>[!tip]
>- For step-by-step mapping (navigation mode), start with depth 2 for a focused and manageable graph.

## Controls
- **URL Input**: Enter the website address to map.
- **Depth Input**: Set the maximum number of nodes to scan (higher values for full mapping, lower for step-by-step).
- **Start Mapping**: Begins a new site scan. Disabled while mapping is in progress.
- **Stop**: Halts the current mapping and enables starting a new one. Always click **Stop** before starting a new mapping.
- **Export Map**: Downloads the current site map as a JSON file.
- **Expand Selected**: Expands only the currently selected node, adding its direct children to the graph. Useful for gradual exploration.

## Recommendations
- Always click **Stop** before starting a new mapping to reset the application state.
- Use the legend at the bottom left to understand node color meanings.

## Features
- Interactive, zoomable, and pannable graph visualization.
- GitHub-inspired dark blue theme.
- Node selection, highlighting, and visit button.
- Loop prevention and progress feedback.
- Export to JSON.

---

*For more details, see the screenshot above or try the app online!*




