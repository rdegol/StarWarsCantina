# Star Wars Character Datapad

A React page for browsing Star Wars characters. Pick a character (or search for one) to see their attributes, species, homeworld, films, starships and vehicles. All data comes live from [SWAPI](https://swapi.info/).

Built with React 19, Vite 8 and Tailwind CSS 4. Tests use Vitest and React Testing Library.

## Setting up the development environment

### Prerequisites

- **Node.js** 22.22.2 or later in the 22.x line, 24.15 or later in the 24.x line, or 26+. Check with `node -v`.
- **npm** (comes with Node.js).
- **Git**.

### Install

```sh
git clone https://github.com/rdegol/StarWarsCantina.git
cd StarWarsCantina
npm install
```

### Run the dev server

```sh
npm run dev
```

Open http://localhost:5173/ (or http://localhost:5173/character.html). Changes to files in `src/` reload in the browser automatically.

The page needs internet access to load data from `https://swapi.info/api`.

> Opening `index.html` or `character.html` directly from disk (a `file:///` URL) shows a blank page. Always open it through the dev server or the preview server.

### Lint

```sh
npm run lint
```

## Building

```sh
npm run build
```

This writes a production build to `dist/`, with one page for each HTML entry (`index.html` and `character.html`). The `dist/` folder is cleared on every build, so keep source files and images in `src/` (images go in `src/assets/`).

To check the production build locally:

```sh
npm run preview
```

Then open http://localhost:4173/character.html.

To deploy, upload the contents of `dist/` to any static web host.

## Running the tests

```sh
npm test
```

This runs Vitest in watch mode, so tests re-run whenever you save a file. Press `q` to quit.

Other ways to run them:

| Command | What it does |
| --- | --- |
| `npx vitest run` | Run all tests once and exit (use this in CI). |
| `npx vitest run -t "search"` | Run only tests whose name contains "search". |
| `npx vitest run src/character.test.jsx` | Run a single test file. |

The tests use a simulated browser (jsdom) and replace `fetch` with sample SWAPI data, so they don't need internet access or a running dev server.


## Assumptions

- Data was limited in size so pagination wasn't included
- English only supported
- Films only include first 6. Last trilogy was not in data set so it is not displayed
- Images are placeholders
- All characters would be added to the list on page load. Character additions would need a page refresh to be displayed.

## Technical Approach

Since this is a read-only display page, the supporting data I build a web page that displayed the data returned from the API. As there was very limited data transformation in the front end, based on the wireframe, there was no need to build a middle tier to support data manipulation. My assumption that the REST API was handling the back-end data for the life of the app.

Since the page need to refresh data based on data selections, I used React as the framework to display the data. This allow quick refresh of the page when a different character was chosen.

It's a responsive web page but it has not been tested on mobile or table devices.

## Risks and Limitations

- Based on the assumption that there is a limited set of data and characters, performance is not a concern. If we needed to scale to a large amount of characters, there could be performance issues.
- Dynamically adding films in not possible.

## Future Enhancements
- Additional pages for Film, Vehicle and Starship details
- Testing and optimization for mobile
- Add Character sort alphabetically or by importance
- Change list to be only characters viewed. 
- Search should have context searching.

## AI Assisted Tools

This was developed with Claude Code in Visual Studio Code. I added the wireframe from the requirements to create the shell. After investigating the API documentation, I had Claude call the API and fill in each data piece. On every change, I did a code review of each change to understand what changed. I then did manual testing of each change to ensure that there were no regressions in the changes.

