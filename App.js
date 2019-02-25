import React, {Component} from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  AsyncStorage,
} from 'react-native'
import shortId from 'shortid'
import * as firebase from 'firebase'
import {
  TaskManager,
  Constants,
  Location,
  Permissions,
  Notifications,
} from 'expo'

firebase.initializeApp({
  apiKey: 'AIzaSyA9ghVwyT5n7Eltf0eIIANh1cHnD_zaLnY',
  authDomain: 'davidapp-c182d.firebaseapp.com',
  databaseURL: 'https://davidapp-c182d.firebaseio.com',
  projectId: 'davidapp-c182d',
  storageBucket: 'davidapp-c182d.appspot.com',
  messagingSenderId: '921771398035',
})

TaskManager.defineTask('shareLocation', ({data: {locations}, error}) => {
  if (error) return
  if (locations) {
    const {uid} = firebase.auth().currentUser
    firebase
      .database()
      .ref(`users/${uid}/locations/${new Date()}`)
      .set(locations)
  }
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

const STORAGE_PREFIX = '@MusicTasteStudy'

export default class App extends Component {
  state = {
    uId: null,
    permissions: 'loading',
  }

  render() {
    // console.log(this.state)

    return (
      <View style={styles.container}>
        {(() => {
          switch (this.state.permissions) {
            case 'loading':
              return (
                <View>
                  <Text>Loading</Text>
                </View>
              )

            case 'unrequested': {
              return (
                <TouchableOpacity onPress={this.grantPermissions}>
                  <Text>Grant permissions</Text>
                </TouchableOpacity>
              )
            }

            case 'neither': {
              return (
                <View>
                  <Text>Didn't grant permissions</Text>
                </View>
              )
            }

            case 'location': {
              return (
                <View>
                  <Text>Didn't grant location permissions</Text>
                </View>
              )
            }

            case 'notifications': {
              return (
                <View>
                  <Text>Didn't grant notification permissions</Text>
                </View>
              )
            }

            case 'both': {
              return (
                <View>
                  <Text>Come back in 30 days!</Text>
                </View>
              )
            }

            default: {
              return (
                <View>
                  <Text>Error</Text>
                </View>
              )
            }
          }
        })()}
      </View>
    )
  }

  async componentDidMount() {
    console.log('yo')

    try {
      const [maybeUId, permissions, tracking] = await Promise.all([
        AsyncStorage.getItem(`${STORAGE_PREFIX}:uId`),
        AsyncStorage.getItem(`${STORAGE_PREFIX}:permissions`),
        AsyncStorage.getItem(`${STORAGE_PREFIX}:tracking`),
      ])

      console.log(permissions)

      permissions
        ? this.setState(lastState => ({...lastState, permissions}))
        : this.setState(lastState => ({
            ...lastState,
            permissions: 'unrequested',
          }))

      if (!tracking && (permissions === 'both' || permissions === 'location')) {
        firebase
          .auth()
          .signInAnonymously()
          .then(({user: {uid}}) => {
            firebase
              .database()
              .ref(`users/${uid}/id`)
              .set(this.state.uId)

            this.startTracking()
          })
          .catch(function(error) {
            var errorCode = error.code
            var errorMessage = error.message
            if (errorCode === 'auth/operation-not-allowed') {
              alert('You must enable Anonymous auth in the Firebase Console.')
            } else {
              console.error(error)
            }
          })
        this.startTracking()
      }

      if (maybeUId) {
        this.setState(lastState => ({
          ...lastState,
          uId: maybeUId,
        }))
      }

      //
      else {
        const newUId = shortId()
        try {
          this.setState(lastState => ({
            ...lastState,
            uId: newUId,
            permissions: 'unrequested',
          }))
          await AsyncStorage.setItem(`${STORAGE_PREFIX}:uId`, newUId)
        } catch (e) {
          console.log(e)
        }
      }
    } catch (e) {
      console.log(e)
    }
  }

  startTracking = async () => {
    await Location.startLocationUpdatesAsync('shareLocation', {
      accuracy: Location.Accuracy.Highest,
    })
  }

  grantPermissions = async () => {
    let [
      {status: locationStatus},
      {status: notificationStatus},
    ] = await Promise.all([
      Permissions.askAsync(Permissions.LOCATION),
      Permissions.askAsync(Permissions.NOTIFICATIONS),
    ])

    const permissions = (() => {
      if (locationStatus && notificationStatus) {
        return 'both'
      } else if (locationStatus) {
        return 'location'
      } else if (notificationStatus) {
        return 'notifications'
      } else {
        return 'none'
      }
    })()

    this.setState(lastState => ({...lastState, permissions}))
    await AsyncStorage.setItem(`${STORAGE_PREFIX}:permissions`, permissions)
  }
}
