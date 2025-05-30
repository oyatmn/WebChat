import type { Room } from '@rtco/client'

import { VirtualRoomExtern } from '@/domain/externs/VirtualRoom'
import { stringToHex } from '@/utils'
import EventHub from '@resreq/event-hub'
import type { RoomMessage } from '@/domain/VirtualRoom'
import { JSONR } from '@/utils'
import { VIRTUAL_ROOM_ID } from '@/constants/config'
import Peer from './Peer'

export interface Config {
  peer: Peer
  roomId: string
}

class VirtualRoom extends EventHub {
  readonly peer: Peer
  readonly roomId: string
  readonly peerId: string
  private room?: Room

  constructor(config: Config) {
    super()
    this.peer = config.peer
    this.roomId = config.roomId
    this.peerId = config.peer.id
    this.joinRoom = this.joinRoom.bind(this)
    this.sendMessage = this.sendMessage.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onJoinRoom = this.onJoinRoom.bind(this)
    this.onLeaveRoom = this.onLeaveRoom.bind(this)
    this.leaveRoom = this.leaveRoom.bind(this)
    this.onError = this.onError.bind(this)
  }

  joinRoom() {
    if (this.room) {
      this.room = this.peer.join(this.roomId)
    } else {
      if (this.peer.state === 'ready') {
        this.room = this.peer.join(this.roomId)
        this.emit('action')
      } else {
        this.peer!.on('open', () => {
          this.room = this.peer.join(this.roomId)
          this.emit('action')
        })
      }
    }
    return this
  }

  sendMessage(message: RoomMessage, id?: string | string[]) {
    if (!this.room) {
      this.once('action', () => {
        if (!this.room) {
          this.emit('error', new Error('Room not joined'))
        } else {
          this.room.send(JSONR.stringify(message)!, id)
        }
      })
    } else {
      this.room.send(JSONR.stringify(message)!, id)
    }
    return this
  }

  onMessage(callback: (message: RoomMessage) => void) {
    if (!this.room) {
      this.once('action', () => {
        if (!this.room) {
          this.emit('error', new Error('Room not joined'))
        } else {
          this.room.on('message', (message) => callback(JSONR.parse(message) as RoomMessage))
        }
      })
    } else {
      this.room.on('message', (message) => callback(JSONR.parse(message) as RoomMessage))
    }
    return this
  }

  onJoinRoom(callback: (id: string) => void) {
    if (!this.room) {
      this.once('action', () => {
        if (!this.room) {
          this.emit('error', new Error('Room not joined'))
        } else {
          this.room.on('join', (id) => callback(id))
        }
      })
    } else {
      this.room.on('join', (id) => callback(id))
    }
    return this
  }

  onLeaveRoom(callback: (id: string) => void) {
    if (!this.room) {
      this.once('action', () => {
        if (!this.room) {
          this.emit('error', new Error('Room not joined'))
        } else {
          this.room.on('leave', (id) => callback(id))
        }
      })
    } else {
      this.room.on('leave', (id) => callback(id))
    }
    return this
  }

  leaveRoom() {
    if (!this.room) {
      this.once('action', () => {
        if (!this.room) {
          this.emit('error', new Error('Room not joined'))
        } else {
          this.room.leave()
          this.room = undefined
        }
      })
    } else {
      this.room.leave()
      this.room = undefined
    }
    return this
  }
  onError(callback: (error: Error) => void) {
    this.peer?.on('error', (error) => callback(error))
    this.on('error', (error: Error) => callback(error))
    return this
  }
}

const hostRoomId = stringToHex(VIRTUAL_ROOM_ID)

const virtualRoom = new VirtualRoom({ roomId: hostRoomId, peer: Peer.createInstance() })

export const VirtualRoomImpl = VirtualRoomExtern.impl(virtualRoom)
