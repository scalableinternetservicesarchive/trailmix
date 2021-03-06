import { Dialog, DialogContent, IconButton, Typography } from '@material-ui/core'
import Checkbox from '@material-ui/core/Checkbox'
import MuiDialogTitle from '@material-ui/core/DialogTitle'
import { createStyles, Theme, withStyles, WithStyles } from '@material-ui/core/styles'
import CloseIcon from '@material-ui/icons/Close'
import Favorite from '@material-ui/icons/Favorite'
import FavoriteBorder from '@material-ui/icons/FavoriteBorder'
import { RouteComponentProps } from '@reach/router'
import * as React from 'react'
import { Component } from 'react'
import { getApolloClient } from '../../graphql/apolloClient'
import { TrailDesc, TrailTitle } from '../../style/header'
import { AppRouteParams } from '../nav/route'
import { favorite, unfavorite } from '../playground/mutateHikes'
import { CommentsSection } from './CommentSection'

//const TD = style('td', 'mid-gray pa3 v-mid', { minWidth: '7em' })

interface HikingListProps extends RouteComponentProps, AppRouteParams {
  allHikes: Trail[]
}
export interface Trail {
  id: string
  name: string
  length: number
  summary: string
  difficulty: string
  stars: number
  starVotes: number
  location: string
  latitude: number
  longitude: number
  conditionStatus: string
  conditionDetails: string
  conditionDate: string
  comments: string[]
  names: string[]
  dates: string[]
  likes: number[]
}

interface trailInfo {
  id: number
  title?: string
  summary?: string
  length?: number
  difficulty?: string
  stars?: number
  location?: string
  latitude?: number
  longitude?: number
  conditionStatus?: string
  conditionDetails?: string
  conditionDate?: string
  icon?: undefined | string
  onClick?: () => void | undefined
  comments: string[]
  names: string[]
  dates: string[]
  likes: number[]
}

interface trailStyle {
  background?: string
  outline: string
  width: string
  borderRadius: string
  opacity: number
}

const buttonStyle: trailStyle = {
  outline: 'none',
  width: '70%',
  borderRadius: '25px',
  opacity: 1,
}

const styles = (theme: Theme) =>
  createStyles({
    root: {
      margin: 0,
      padding: theme.spacing(2),
    },
    closeButton: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
      color: theme.palette.grey[500],
    },
  })

export interface DialogTitleProps extends WithStyles<typeof styles> {
  id: string
  children: React.ReactNode
  onClose: () => void
}

const DialogTitle = withStyles(styles)((props: DialogTitleProps) => {
  const { children, classes, onClose, ...other } = props
  return (
    <MuiDialogTitle disableTypography className={classes.root} {...other}>
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      ) : null}
    </MuiDialogTitle>
  )
})

export default class HikeList extends Component<HikingListProps, { open: boolean }> {
  openTabs: Map<string | undefined, boolean>
  favorited: Map<number, boolean>

  constructor(props: HikingListProps) {
    super(props)
    this.state = { open: false }
    this.openTabs = new Map<string | undefined, boolean>()
    this.favorited = new Map<number, boolean>()
  }

  togglePopup(title: string | undefined, task: string) {
    console.log(task)
    if (!this.openTabs.has(title)) {
      if (!this.state.open) {
        this.setState({ open: true })
        this.openTabs.set(title, true)
      }
    } else {
      if (task === 'close') {
        if (this.state.open) {
          this.setState({ open: false })
          this.openTabs.delete(title)
        }
      }
    }
    console.log(this.openTabs)
  }

  async addFav(e: React.MouseEvent<HTMLButtonElement, MouseEvent>, hike: trailInfo) {
    e.stopPropagation()
    if (
      hike.title == null ||
      hike.summary == null ||
      hike.length == null ||
      hike.difficulty == null ||
      hike.location == null ||
      hike.stars == null ||
      hike.latitude == null ||
      hike.longitude == null
    ) {
      return
    }
    if (this.favorited.get(hike.id)) {
      //where we unfavorite
      await unfavorite(getApolloClient(), {
        hike: {
          id: hike.id,
          name: hike.title,
          summary: hike.summary,
          length: hike.length,
          difficulty: hike.difficulty,
          location: hike.location,
          latitude: hike.latitude,
          longitude: hike.longitude,
          stars: hike.stars,
        },
      })
      this.favorited.set(hike.id, false)
      return
    }
    //where we favorite
    await favorite(getApolloClient(), {
      hike: {
        id: hike.id,
        name: hike.title,
        summary: hike.summary,
        length: hike.length,
        difficulty: hike.difficulty,
        location: hike.location,
        latitude: hike.latitude,
        longitude: hike.longitude,
        stars: hike.stars,
      },
    })
    this.favorited.set(hike.id, true)
  }

  TrailInfoCard(args: trailInfo) {
    return (
      <div
        id="trailInfo"
        className="flex items-center pa2 hover-bg-light-green bg-washed-green"
        style={buttonStyle}
        onClick={() => this.togglePopup(args.title, 'open')}
        key={args.id}
      >
        <img src={args.icon ? args.icon : undefined} className="ph3" />
        <div style={{ width: '100%' }}>
          <div className="flex flex-column" style={{ float: 'left', width: '90%' }}>
            <TrailTitle className="pv2">{args.title}</TrailTitle>
            <TrailDesc className="pb2">{args.summary} </TrailDesc>
          </div>
          <div style={{ float: 'right', width: '10%', marginLeft: 'auto', marginRight: 0 }}>
            <Checkbox
              onClick={e => this.addFav(e, args)}
              icon={<FavoriteBorder />}
              checkedIcon={<Favorite />}
              name="checkedH"
            />
          </div>
        </div>
        <Dialog onClose={args.onClick} aria-labelledby="customized-dialog-title" open={!!this.openTabs.get(args.title)}>
          <DialogTitle id="customized-dialog-title" onClose={() => this.togglePopup(args.title, 'close')}>
            {args.title}
          </DialogTitle>
          <DialogContent dividers>
            <Typography gutterBottom>{args.summary}</Typography>
            <Typography gutterBottom>
              This {args.length}-mile hike, located in {args.location}, has {args.difficulty}-level difficulty and is
              currently rated {args.stars} stars.
            </Typography>
            <CommentsSection
              hikeid={args.id}
              comments={args.comments}
              names={args.names}
              dates={args.dates}
              likes={args.likes}
            />
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  render() {
    return this.props.allHikes.map(item => {
      return this.TrailInfoCard({
        id: parseInt(item.id),
        title: item.name,
        summary: item.summary,
        length: item.length,
        difficulty: item.difficulty,
        stars: item.stars,
        location: item.location,
        conditionStatus: item.conditionStatus,
        conditionDetails: item.conditionDetails,
        conditionDate: item.conditionDate,
        latitude: item.latitude,
        longitude: item.longitude,
        comments: item.comments,
        names: item.names,
        dates: item.dates,
        likes: item.likes,
      })
    })
  }
}
