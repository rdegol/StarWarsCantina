import { useEffect, useRef, useState } from 'react'
import episode1 from './assets/I.jpg'
import episode2 from './assets/eII.jpg'
import episode3 from './assets/eiii.jpg'
import episode4 from './assets/eiv.jpg'
import episode5 from './assets/ev.jpg'
import episode6 from './assets/evi.jpg'
import starshipThumbnail from './assets/starships.jpeg'
import vehicleThumbnail from './assets/vehicles.jpg'

const PEOPLE_URL = 'https://swapi.info/api/people'
const FILMS_URL = 'https://swapi.info/api/films'
// SWAPI leaves species empty for humans, so an empty list falls back to Human.
const HUMAN_SPECIES_URL = 'https://swapi.info/api/species/1'
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']
// Film thumbnails keyed by SWAPI episode_id.
const FILM_THUMBNAILS = {
  1: episode1,
  2: episode2,
  3: episode3,
  4: episode4,
  5: episode5,
  6: episode6,
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

// Formats numeric SWAPI strings ("200000" -> "200,000", "172" + " cm" -> "172 cm");
// non-numeric values such as "unknown" or "n/a" are returned unchanged.
function withUnit(value, unit = '') {
  const number = Number(String(value).replaceAll(',', ''))
  if (value === '' || Number.isNaN(number)) return value
  return `${number.toLocaleString()}${unit}`
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function toCraft(craft, type) {
  return {
    url: craft.url,
    name: craft.name,
    type: capitalize(type),
    crew: `${craft.crew} / ${craft.passengers}`,
    model: `${craft.model} / ${craft.manufacturer}`,
  }
}

async function loadPeople(url, signal) {
  const people = await getJson(url, signal)
  return people.map(({ name, url }) => ({ name, url }))
}

async function loadFilms(url, signal) {
  const films = await getJson(url, signal)
  return films
    .toSorted((a, b) => a.episode_id - b.episode_id)
    .map((film) => ({
      url: film.url,
      title: film.title,
      episode: `Episode ${ROMAN[film.episode_id - 1] ?? film.episode_id}`,
      thumbnail: FILM_THUMBNAILS[film.episode_id],
    }))
}

// Fetches a person, then the homeworld, species, starships and vehicles it links to.
async function loadCharacter(url, signal) {
  const person = await getJson(url, signal)
  const [homeworld, species, starships, vehicles] = await Promise.all([
    person.homeworld ? getJson(person.homeworld, signal) : null,
    getJson(person.species[0] ?? HUMAN_SPECIES_URL, signal),
    Promise.all(person.starships.map((shipUrl) => getJson(shipUrl, signal))),
    Promise.all(person.vehicles.map((vehicleUrl) => getJson(vehicleUrl, signal))),
  ])

  return {
    name: person.name,
    filmUrls: person.films,
    attributes: [
      ['Birth year', person.birth_year],
      ['Gender', person.gender],
      ['Height', withUnit(person.height, ' cm')],
      ['Mass', withUnit(person.mass, ' kg')],
      ['Eye color', person.eye_color],
      ['Hair color', person.hair_color],
      ['Skin color', person.skin_color],
    ],
    species: {
      name: species.name,
      details: [
        ['Classification', species.classification],
        ['Designation', species.designation],
        ['Average height', withUnit(species.average_height, ' cm')],
        ['Average lifespan', withUnit(species.average_lifespan, ' yr')],
        ['Language', species.language],
      ],
    },
    homeworld: homeworld && {
      name: homeworld.name,
      details: [
        ['Population', withUnit(homeworld.population)],
        ['Terrain', homeworld.terrain],
        ['Climate', homeworld.climate],
        ['Surface water', withUnit(homeworld.surface_water, '%')],
        ['Diameter', withUnit(homeworld.diameter, ' km')],
        ['Rotation period', withUnit(homeworld.rotation_period, ' hr')],
        ['Orbital period', withUnit(homeworld.orbital_period, ' d')],
        ['Gravity', homeworld.gravity],
      ],
    },
    starships: starships.map((ship) => toCraft(ship, ship.starship_class)),
    vehicles: vehicles.map((vehicle) => toCraft(vehicle, vehicle.vehicle_class)),
  }
}

// Runs load(key, signal) whenever key changes, aborting the previous run.
// A null key leaves the state idle. load must be a stable (module-level) function.
function useAsync(load, key) {
  const [result, setResult] = useState({ key: null, status: 'idle', data: null })

  useEffect(() => {
    if (key == null) return
    const controller = new AbortController()
    load(key, controller.signal).then(
      (data) => setResult({ key, status: 'ready', data }),
      (error) => {
        if (error.name !== 'AbortError') setResult({ key, status: 'error', data: null })
      },
    )
    return () => controller.abort()
  }, [load, key])

  // A result for an older key means the current key is still loading.
  if (result.key === key) return result
  return { status: key == null ? 'idle' : 'loading', data: null }
}

function SectionHeading({ children }) {
  return (
    <h2 className="mb-3 text-xs font-bold tracking-wide text-slate-800 uppercase">
      {children}
    </h2>
  )
}

function ImagePlaceholder({ className = '' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="44" height="44" />
      <circle cx="24" cy="16" r="5" />
      <path d="M2 38 L16 24 L24 32 L32 24 L46 38" />
    </svg>
  )
}

function Message({ children }) {
  return <p className="text-sm text-slate-500">{children}</p>
}

function DetailCard({ detail }) {
  if (!detail) {
    return (
      <div className="rounded border border-slate-300 px-3 py-2.5">
        <Message>Not recorded</Message>
      </div>
    )
  }

  return (
    <div className="rounded border border-slate-300">
      <div className="border-b border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-800">
        {detail.name}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-3 py-3 text-sm">
        {detail.details.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-600">{label}:</dt>
            <dd className="text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function CraftList({ items, emptyText, thumbnail }) {
  if (items.length === 0) {
    return (
      <div className="rounded border border-slate-300 p-4">
        <Message>{emptyText}</Message>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-300 rounded border border-slate-300">
      {items.map((item) => (
        <li key={item.url} className="flex gap-4 p-4">
          <img
            src={thumbnail}
            alt=""
            className="h-14 w-20 shrink-0 border border-slate-400 object-cover sm:h-16 sm:w-24"
          />
          <dl className="grid min-w-0 grid-cols-1 gap-y-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6 sm:gap-y-2">
            <dt className="font-bold text-slate-800">{item.name}</dt>
            <dd className="text-slate-700">{item.type}</dd>
            <dt className="text-slate-600">Crew / Passengers:</dt>
            <dd className="text-slate-700">{item.crew}</dd>
            <dt className="text-slate-600">Model / Manufacturer:</dt>
            <dd className="text-slate-700">{item.model}</dd>
          </dl>
        </li>
      ))}
    </ul>
  )
}

// Single-select listbox: shows each character's name and keeps its SWAPI url
// as the selection value. Arrow keys / Home / End move the selection.
function CharacterList({ characters, status, selectedUrl, onSelect }) {
  const listRef = useRef(null)
  const selectedIndex = characters.findIndex((c) => c.url === selectedUrl)

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [selectedUrl])

  function handleKeyDown(event) {
    if (characters.length === 0) return
    const last = characters.length - 1
    const next = {
      ArrowDown: Math.min(selectedIndex + 1, last),
      ArrowUp: Math.max(selectedIndex - 1, 0),
      Home: 0,
      End: last,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    onSelect(characters[next].url)
  }

  const boxClass =
    'max-h-48 overflow-y-auto rounded border border-slate-300 p-2 text-sm lg:absolute lg:inset-0 lg:max-h-none'

  if (status !== 'ready') {
    return (
      <div className={boxClass} role="status">
        <p className={`px-2.5 py-1 ${status === 'error' ? 'text-red-700' : 'text-slate-500'}`}>
          {status === 'error' ? 'Could not load characters.' : 'Loading characters…'}
        </p>
      </div>
    )
  }

  return (
    <ul
      ref={listRef}
      role="listbox"
      tabIndex={0}
      aria-label="Characters"
      aria-activedescendant={selectedIndex >= 0 ? `character-option-${selectedIndex}` : undefined}
      onKeyDown={handleKeyDown}
      className={`${boxClass} focus:outline-2 focus:outline-offset-2 focus:outline-slate-500`}
    >
      {characters.map((character, index) => (
        <li
          key={character.url}
          id={`character-option-${index}`}
          role="option"
          aria-selected={character.url === selectedUrl}
          data-url={character.url}
          onClick={() => onSelect(character.url)}
          className="cursor-pointer border border-transparent px-2.5 py-1 text-slate-700 select-none hover:bg-slate-50 aria-selected:border-slate-300 aria-selected:bg-slate-100"
        >
          {character.name}
        </li>
      ))}
    </ul>
  )
}

function Character() {
  const [selectedUrl, setSelectedUrl] = useState(null)
  const people = useAsync(loadPeople, PEOPLE_URL)
  const films = useAsync(loadFilms, FILMS_URL)
  const detail = useAsync(loadCharacter, selectedUrl)

  const selected = detail.status === 'ready' ? detail.data : null
  const detailMessage = {
    idle: 'Select a character to view their details.',
    loading: 'Loading character…',
    error: 'Could not load this character.',
  }[detail.status]

  // Selects the first character (in list order) whose name contains the query,
  // case-insensitively; no match clears the selection. An empty query leaves it as is.
  function handleSearch(event) {
    const query = event.target.value.trim().toLowerCase()
    if (query === '') return
    const match = (people.data ?? []).find((c) => c.name.toLowerCase().includes(query))
    setSelectedUrl(match?.url ?? null)
  }

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <h1 className="text-xl text-slate-900 sm:text-2xl">Star Wars Character Datapad</h1>
          <label className="relative block w-full sm:w-64">
            <span className="sr-only">Search characters</span>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            >
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13 13l4 4" />
            </svg>
            <input
              type="search"
              placeholder="Search characters"
              onChange={handleSearch}
              className="w-full rounded border border-slate-300 py-1.5 pr-3 pl-8 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
            />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-8">
        <section>
          <SectionHeading>Characters</SectionHeading>
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="lg:relative lg:w-44 lg:shrink-0">
              <CharacterList
                characters={people.data ?? []}
                status={people.status}
                selectedUrl={selectedUrl}
                onSelect={setSelectedUrl}
              />
            </div>

            <article className="flex-1 rounded border border-slate-300 p-4 sm:p-6" aria-live="polite">
              {selected ? (
                <CharacterDetails character={selected} />
              ) : (
                <div className="flex min-h-48 items-center justify-center">
                  <Message>{detailMessage}</Message>
                </div>
              )}
            </article>
          </div>
        </section>

        <section>
          <SectionHeading>Films</SectionHeading>
          <div className="rounded border border-slate-300 p-6">
            {films.status === 'ready' ? (
              <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
                {films.data.map((film) => {
                  const appears = selected?.filmUrls.includes(film.url) ?? false
                  return (
                    <li
                      key={film.url}
                      className={`flex flex-col items-center text-center text-xs ${appears ? 'text-slate-800' : 'text-slate-300'}`}
                    >
                      {film.thumbnail ? (
                        <img
                          src={film.thumbnail}
                          alt=""
                          width="96"
                          height="48"
                          className={`mb-2 h-12 w-24 object-cover ${appears ? '' : 'opacity-30 grayscale'}`}
                        />
                      ) : (
                        <ImagePlaceholder className={`mb-2 size-12 ${appears ? 'text-slate-500' : 'text-slate-300'}`} />
                      )}
                      <span className="font-bold">{film.title}</span>
                      <span>{film.episode}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Message>{films.status === 'error' ? 'Could not load films.' : 'Loading films…'}</Message>
            )}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <SectionHeading>Starships</SectionHeading>
            <CraftList items={selected?.starships ?? []} emptyText={selected ? 'No starships' : '—'} thumbnail={starshipThumbnail} />
          </section>
          <section>
            <SectionHeading>Vehicles</SectionHeading>
            <CraftList items={selected?.vehicles ?? []} emptyText={selected ? 'No vehicles' : '—'} thumbnail={vehicleThumbnail} />
          </section>
        </div>
      </main>
    </div>
  )
}

function CharacterDetails({ character }) {
  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-12 shrink-0 text-slate-500"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="23" />
          <circle cx="24" cy="18" r="6" />
          <path d="M13 37 c0-7 5-11 11-11 s11 4 11 11 v2 h-22 z" />
        </svg>
        <h2 className="text-xl font-bold text-slate-800">{character.name}</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <SectionHeading>Attributes</SectionHeading>
          <table className="w-full border border-slate-300 text-sm">
            <tbody className="divide-y divide-slate-300">
              {character.attributes.map(([label, value]) => (
                <tr key={label} className="divide-x divide-slate-300">
                  <th scope="row" className="px-3 py-2 text-left font-normal text-slate-600">
                    {label}
                  </th>
                  <td className="px-3 py-2 text-slate-800">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <SectionHeading>Species</SectionHeading>
          <DetailCard detail={character.species} />
        </div>
        <div>
          <SectionHeading>Homeworld</SectionHeading>
          <DetailCard detail={character.homeworld} />
        </div>
      </div>
    </>
  )
}

export default Character
