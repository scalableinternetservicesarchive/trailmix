import { useQuery } from '@apollo/client'
import { LinearProgress } from '@material-ui/core'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import { RouteComponentProps } from '@reach/router'
import * as React from 'react'
import { Component } from 'react'
import { getApolloClient } from '../../graphql/apolloClient'
import { FetchComments, FetchHikes, FetchLatLon, FetchLatLonVariables } from '../../graphql/query.gen'
import { H2 } from '../../style/header'
import { Spacer } from '../../style/spacer'
import { IntroText } from '../../style/text'
import { AppRouteParams } from '../nav/route'
import { fetchComments } from '../playground/mutateComments'
import { addHikeToDB, fetchHikes } from '../playground/mutateHikes'
import { fetchLatLon } from './fetchLatLon'
import { default as HikeList, Trail } from './HikeList'
import { Page } from './Page'

interface HikesPageProps extends RouteComponentProps, AppRouteParams {}

let zipcode: number
let latitude: number
let longitude: number
let getHikesButton = false
let idArr: number[] = []
let com_map: Map<number, string[]>
let name_map: Map<number, string[]>
let date_map: Map<number, string[]>
let like_map: Map<number, number[]>
let trails: Trail[] = []
let new_coord: boolean
let local_load: boolean

function GetLatLon({ children }: any) {
  if (zipcode) {
    const { data, error, loading } = useQuery<FetchLatLon, FetchLatLonVariables>(fetchLatLon, {
      variables: { zipcode },
      fetchPolicy: 'cache-first',
    })
    if (data && data.coordinates) {
      if (data.coordinates.lat == latitude && data.coordinates.lon == longitude) {
        new_coord = false
        return null
      }
      new_coord = true
      latitude = data.coordinates.lat
      longitude = data.coordinates.lon
      getHikesButton = true
    } else if (loading) {
      return null
    } else if (error) {
      return null
    }
    return (
      <div>
        <Spacer $h4 />
        <IntroText>
          You are near latitude {latitude} and longitude {longitude}.
        </IntroText>
        <GetComments>{({ data, error, loading }: any) => console.log(data)}</GetComments>
        <GetHikesCoords>{({ data, error, loading }: any) => console.log(data)}</GetHikesCoords>
      </div>
    )
  } else {
    return null
  }
}

function GetHikesCoords({ children }: any) {
  const { data } = useQuery<FetchHikes>(fetchHikes, { fetchPolicy: 'cache-first' })

  if (data && data.hikes) {
    local_load = true
    trails = []
    const margin = 0.25
    const d = data.hikes.filter(
      // eslint-disable-next-line prettier/prettier
      hike => Math.abs(latitude - hike.latitude) < margin && Math.abs(longitude - hike.longitude) < margin
    )

    if (d.length > 0) {
      console.log('Entries found in database:')
      console.log(d)

      const comArr: string[] = []
      const nameArr: string[] = []
      const dateArr: string[] = []
      const likeArr: number[] = []

      d.forEach(function (arrayItem) {
        const a: Trail = {
          id: arrayItem.id.toString(),
          name: arrayItem.name,
          length: arrayItem.length,
          summary: arrayItem.summary,
          difficulty: arrayItem.difficulty,
          stars: arrayItem.stars,
          starVotes: 0,
          location: arrayItem.location,
          latitude: 0,
          longitude: 0,
          conditionStatus: '',
          conditionDetails: '',
          conditionDate: '',
          comments: comArr,
          names: nameArr,
          dates: dateArr,
          likes: likeArr,
        }
        trails.push(a)
      })
    } else {
      local_load = false
      console.log('No found in database:')
      console.log(d)
    }
  }
  return null
}

function GetComments({ children }: any) {
  const { data } = useQuery<FetchComments>(fetchComments, { fetchPolicy: 'cache-and-network' })
  if (data) {
    idArr.forEach(function (id) {
      const d = data.comments.filter(c => c.hikeNum !== id)
      if (d !== null) {
        const com_arr: string[] = []
        const names_arr: string[] = []
        const dates_arr: string[] = []
        const like_arr: number[] = []
        d.forEach(function (arrayItem) {
          com_arr.push(arrayItem.text)
          names_arr.push(arrayItem.name)
          dates_arr.push(arrayItem.date)
          like_arr.push(arrayItem.likes)
        })
        com_map.set(id, com_arr)
        name_map.set(id, names_arr)
        date_map.set(id, dates_arr)
        like_map.set(id, like_arr)
      }
    })
    idArr = []
  }
  return null
}

export default class HikingPage extends Component<HikesPageProps> {
  constructor(props: HikesPageProps) {
    super(props)
    this.state = { zip: '', loading: false }
    this.getHikes = this.getHikes.bind(this)
    this.handleZipChange = this.handleZipChange.bind(this)
    this.handleLatLonChange = this.handleLatLonChange.bind(this)
    com_map = new Map<number, string[]>()
    name_map = new Map<number, string[]>()
    date_map = new Map<number, string[]>()
    like_map = new Map<number, number[]>()
  }
  state = {
    zip: '',
    loading: false,
  }

  async addHikeInformation(hike: Trail) {
    await addHikeToDB(getApolloClient(), {
      id: parseInt(hike.id),
      name: hike.name,
      stars: hike.stars,
      summary: hike.summary,
      location: hike.location,
      difficulty: hike.difficulty,
      length: hike.length,
      latitude: hike.latitude,
      longitude: hike.longitude,
    })
  }

  async getHikes(event: any) {
    event.preventDefault()
    this.setState({ loading: true })
    const key = '200944544-1e585b592713e202989908ebc84f8478'

    if (local_load) {
      this.setState({
        loading: false,
      })
    }

    if (latitude && longitude && new_coord && !local_load) {
      console.log('API fetch')
      await fetch(
        'https://www.hikingproject.com/data/get-trails?lat=' +
          latitude +
          '&lon=' +
          longitude +
          '&maxDistance=10&key=' +
          key
      )
        .then(response => {
          return response.text()
        })
        .then(hikes => {
          const jsonObj = JSON.parse(hikes)
          const array: Trail[] = []
          for (const entry of jsonObj.trails) {
            if (entry.id != null && entry.id != undefined) {
              idArr.push(entry.id)
            }
            let comArr = com_map.get(entry.id)
            let nameArr = name_map.get(entry.id)
            let dateArr = date_map.get(entry.id)
            let likeArr = like_map.get(entry.id)
            if (comArr == null) {
              comArr = []
            }
            if (nameArr == null) {
              nameArr = []
            }
            if (dateArr == null) {
              dateArr = []
            }
            if (likeArr == null) {
              likeArr = []
            }
            const a: Trail = {
              id: entry.id,
              name: entry.name,
              length: entry.length,
              summary: entry.summary,
              difficulty: entry.difficulty,
              stars: entry.stars,
              starVotes: entry.starVotes,
              location: entry.location,
              latitude: entry.latitude,
              longitude: entry.longitude,
              conditionStatus: entry.conditionStatus,
              conditionDetails: entry.conditionDetails,
              conditionDate: entry.conditionDate,
              comments: comArr,
              names: nameArr,
              dates: dateArr,
              likes: likeArr,
            }
            void this.addHikeInformation(a)
            array.push(a)
          }
          trails = array
          console.log('Hikes fetched:')
          console.log(trails)
          this.setState({
            loading: false,
          })
        })
        .catch(error => console.error(error))
    }
  }
  handleZipChange(event: any) {
    this.setState({ zip: event.target.value })
  }
  handleLatLonChange(event: any) {
    getHikesButton = true
    zipcode = Number(this.state.zip)
    this.setState({ lat: latitude, lon: longitude })
    event.preventDefault()
  }
  render() {
    const hikes = trails
    let progress = null
    if (this.state.loading) {
      progress = <LinearProgress />
    }
    return (
      <Page>
        <H2>Get Hikes Near You!</H2>
        <Spacer $h4 />
        <IntroText>Enter your location and get nearest hikes!</IntroText>
        <Spacer $h4 />
        <form onSubmit={this.handleLatLonChange}>
          <div>
            <TextField
              id="filled-number"
              placeholder="90024"
              InputLabelProps={{
                shrink: true,
              }}
              variant="outlined"
              label="Zipcode"
              value={this.state.zip}
              error={
                this.state.zip.length !== 0 && (this.state.zip.length !== 5 || /^\d+$/.test(this.state.zip) == false)
              }
              onChange={this.handleZipChange}
            />
            <Button
              disabled={this.state.zip.length !== 5 || /^\d+$/.test(this.state.zip) == false}
              onClick={this.handleLatLonChange}
            >
              Submit
            </Button>
            <GetLatLon>{({ data, error, loading }: any) => console.log(data)}</GetLatLon>
            {getHikesButton ? (
              <div className="v-mid">
                <Spacer $h4 />
                <Button variant="contained" color="primary" size="medium" onClick={this.getHikes}>
                  Get Hikes
                </Button>
              </div>
            ) : null}
          </div>
        </form>
        {progress}
        <HikeList allHikes={hikes} />
      </Page>
    )
  }
}
