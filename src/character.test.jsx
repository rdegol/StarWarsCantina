import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Character from './character.jsx'

const API = 'https://swapi.info/api'

const luke = {
  name: 'Luke Skywalker',
  height: '172',
  mass: '77',
  hair_color: 'blond',
  skin_color: 'fair',
  eye_color: 'blue',
  birth_year: '19BBY',
  gender: 'male',
  homeworld: `${API}/planets/1`,
  films: [`${API}/films/1`, `${API}/films/2`, `${API}/films/3`, `${API}/films/6`],
  species: [],
  vehicles: [`${API}/vehicles/14`],
  starships: [`${API}/starships/12`],
  url: `${API}/people/1`,
}

const c3po = {
  ...luke,
  name: 'C-3PO',
  height: '167',
  mass: '75',
  gender: 'n/a',
  species: [`${API}/species/2`],
  vehicles: [],
  starships: [],
  url: `${API}/people/2`,
}

const vader = { ...luke, name: 'Darth Vader', url: `${API}/people/4` }
const anakin = { ...luke, name: 'Anakin Skywalker', url: `${API}/people/11` }

// Keyed by URL; returned as the JSON body of a successful response.
const fixtures = {
  [`${API}/people`]: [luke, c3po, vader, anakin],
  [`${API}/people/1`]: luke,
  [`${API}/people/2`]: c3po,
  [`${API}/people/4`]: vader,
  [`${API}/people/11`]: anakin,
  // Deliberately out of episode order, as SWAPI returns them.
  [`${API}/films`]: [
    { title: 'A New Hope', episode_id: 4, url: `${API}/films/1` },
    { title: 'The Empire Strikes Back', episode_id: 5, url: `${API}/films/2` },
    { title: 'Return of the Jedi', episode_id: 6, url: `${API}/films/3` },
    { title: 'The Phantom Menace', episode_id: 1, url: `${API}/films/4` },
    { title: 'Attack of the Clones', episode_id: 2, url: `${API}/films/5` },
    { title: 'Revenge of the Sith', episode_id: 3, url: `${API}/films/6` },
  ],
  [`${API}/planets/1`]: {
    name: 'Tatooine',
    rotation_period: '23',
    orbital_period: '304',
    diameter: '10465',
    climate: 'arid',
    gravity: '1 standard',
    terrain: 'desert',
    surface_water: '1',
    population: '200000',
  },
  [`${API}/species/1`]: {
    name: 'Human',
    classification: 'mammal',
    designation: 'sentient',
    average_height: '180',
    average_lifespan: '120',
    language: 'Galactic Basic',
  },
  [`${API}/species/2`]: {
    name: 'Droid',
    classification: 'artificial',
    designation: 'sentient',
    average_height: 'n/a',
    average_lifespan: 'indefinite',
    language: 'n/a',
  },
  [`${API}/starships/12`]: {
    name: 'X-wing',
    model: 'T-65 X-wing',
    manufacturer: 'Incom Corporation',
    crew: '1',
    passengers: '0',
    starship_class: 'Starfighter',
    url: `${API}/starships/12`,
  },
  [`${API}/vehicles/14`]: {
    name: 'Snowspeeder',
    model: 't-47 airspeeder',
    manufacturer: 'Incom corporation',
    crew: '2',
    passengers: '0',
    vehicle_class: 'airspeeder',
    url: `${API}/vehicles/14`,
  },
}

let fetchMock

function mockFetch(overrides = {}) {
  const routes = { ...fixtures, ...overrides }
  fetchMock = vi.fn(async (url) => {
    const body = routes[url]
    if (body === undefined || body instanceof Error) {
      return { ok: false, status: 500, json: async () => ({}) }
    }
    return { ok: true, status: 200, json: async () => structuredClone(body) }
  })
  vi.stubGlobal('fetch', fetchMock)
}

async function renderPage() {
  const user = userEvent.setup()
  render(<Character />)
  await screen.findByRole('option', { name: 'Luke Skywalker' })
  return user
}

function option(name) {
  return screen.getByRole('option', { name })
}

beforeEach(() => mockFetch())

describe('character list', () => {
  it('lists every character name from the people endpoint with nothing selected', async () => {
    await renderPage()

    const names = screen.getAllByRole('option').map((el) => el.textContent)
    expect(names).toEqual(['Luke Skywalker', 'C-3PO', 'Darth Vader', 'Anakin Skywalker'])
    expect(screen.queryByRole('option', { selected: true })).not.toBeInTheDocument()
    expect(screen.getByText('Select a character to view their details.')).toBeInTheDocument()
  })

  it('keeps each character url on its option', async () => {
    await renderPage()
    expect(option('C-3PO')).toHaveAttribute('data-url', `${API}/people/2`)
  })

  it('shows an error when the people request fails', async () => {
    mockFetch({ [`${API}/people`]: new Error('down') })
    render(<Character />)
    expect(await screen.findByText('Could not load characters.')).toBeInTheDocument()
  })

  it('selects with the keyboard', async () => {
    const user = await renderPage()
    await user.click(option('Luke Skywalker'))

    await user.keyboard('{ArrowDown}')
    expect(option('C-3PO')).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{End}')
    expect(option('Anakin Skywalker')).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}')
    expect(option('Anakin Skywalker')).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Home}')
    expect(option('Luke Skywalker')).toHaveAttribute('aria-selected', 'true')
  })
})

describe('character details', () => {
  it('fetches the selected character url and shows its formatted attributes and homeworld', async () => {
    const user = await renderPage()
    await user.click(option('Luke Skywalker'))

    expect(await screen.findByRole('heading', { name: 'Luke Skywalker' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(`${API}/people/1`, expect.anything())

    const attributes = screen.getByRole('table')
    expect(within(attributes).getByText('19BBY')).toBeInTheDocument()
    expect(within(attributes).getByText('172 cm')).toBeInTheDocument()
    expect(within(attributes).getByText('77 kg')).toBeInTheDocument()

    expect(screen.getByText('Tatooine')).toBeInTheDocument()
    expect(screen.getByText('200,000')).toBeInTheDocument()
    expect(screen.getByText('10,465 km')).toBeInTheDocument()
    expect(screen.getByText('1%')).toBeInTheDocument()
    expect(screen.getByText('304 d')).toBeInTheDocument()
  })

  it('falls back to Human (species/1) when the species list is empty', async () => {
    const user = await renderPage()
    await user.click(option('Luke Skywalker'))

    expect(await screen.findByText('Human')).toBeInTheDocument()
    expect(screen.getByText('Galactic Basic')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(`${API}/species/1`, expect.anything())
  })

  it('uses the linked species when one is given and leaves non-numeric values unformatted', async () => {
    const user = await renderPage()
    await user.click(option('C-3PO'))

    expect(await screen.findByText('Droid')).toBeInTheDocument()
    expect(screen.getByText('indefinite')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(`${API}/species/1`, expect.anything())
  })

  it('shows starships and vehicles with their type, crew and model', async () => {
    const user = await renderPage()
    await user.click(option('Luke Skywalker'))
    await screen.findByRole('heading', { name: 'Luke Skywalker' })

    expect(screen.getByText('X-wing')).toBeInTheDocument()
    expect(screen.getByText('Starfighter')).toBeInTheDocument()
    expect(screen.getByText('1 / 0')).toBeInTheDocument()
    expect(screen.getByText('T-65 X-wing / Incom Corporation')).toBeInTheDocument()

    expect(screen.getByText('Snowspeeder')).toBeInTheDocument()
    expect(screen.getByText('Airspeeder')).toBeInTheDocument()
  })

  it('says when a character has no starships or vehicles', async () => {
    const user = await renderPage()
    await user.click(option('C-3PO'))

    expect(await screen.findByText('No starships')).toBeInTheDocument()
    expect(screen.getByText('No vehicles')).toBeInTheDocument()
  })

  it('shows an error when the character request fails', async () => {
    mockFetch({ [`${API}/people/2`]: new Error('down') })
    const user = await renderPage()
    await user.click(option('C-3PO'))

    expect(await screen.findByText('Could not load this character.')).toBeInTheDocument()
  })
})

describe('films', () => {
  function filmItem(title) {
    return screen.getByText(title).closest('li')
  }

  it('lists films in episode order with thumbnails', async () => {
    await renderPage()
    await screen.findByText('The Phantom Menace')

    const titles = screen.getAllByText(/^Episode /).map((el) => el.textContent)
    expect(titles).toEqual([
      'Episode I',
      'Episode II',
      'Episode III',
      'Episode IV',
      'Episode V',
      'Episode VI',
    ])
    expect(within(filmItem('A New Hope')).getByRole('presentation')).toHaveAttribute('width', '96')
  })

  it('fades only the films the selected character is not in', async () => {
    const user = await renderPage()
    await user.click(option('Luke Skywalker'))
    await screen.findByRole('heading', { name: 'Luke Skywalker' })

    for (const title of ['The Phantom Menace', 'Attack of the Clones']) {
      expect(within(filmItem(title)).getByRole('presentation')).toHaveClass('grayscale')
    }
    for (const title of ['Revenge of the Sith', 'A New Hope', 'The Empire Strikes Back', 'Return of the Jedi']) {
      expect(within(filmItem(title)).getByRole('presentation')).not.toHaveClass('grayscale')
    }
  })
})

describe('search', () => {
  function searchBox() {
    return screen.getByRole('searchbox', { name: 'Search characters' })
  }

  it('selects the first name containing the query, case-insensitively', async () => {
    const user = await renderPage()

    await user.type(searchBox(), 'VADER')
    expect(option('Darth Vader')).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: 'Darth Vader' })).toBeInTheDocument()

    await user.clear(searchBox())
    await user.type(searchBox(), 'skywalker')
    expect(option('Luke Skywalker')).toHaveAttribute('aria-selected', 'true')
    expect(option('Anakin Skywalker')).toHaveAttribute('aria-selected', 'false')
  })

  it('deselects everything when nothing matches', async () => {
    const user = await renderPage()
    await user.type(searchBox(), 'luke')
    await screen.findByRole('heading', { name: 'Luke Skywalker' })

    await user.type(searchBox(), 'zzz')

    expect(screen.queryByRole('option', { selected: true })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('Select a character to view their details.')).toBeInTheDocument(),
    )
  })

  it('keeps the current selection when the query is cleared', async () => {
    const user = await renderPage()
    await user.type(searchBox(), 'c-3')
    expect(option('C-3PO')).toHaveAttribute('aria-selected', 'true')

    await user.clear(searchBox())
    expect(option('C-3PO')).toHaveAttribute('aria-selected', 'true')
  })
})
