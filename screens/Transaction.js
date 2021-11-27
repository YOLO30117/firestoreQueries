import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  ToastAndroid,
} from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import db from "../config"
import firebase from 'firebase';

export default class TransactionScreen extends React.Component {
  constructor() {
    super();
    this.state = {
      hasCameraPermissions: null,
      scanned: false,
      scannedData: '',
      buttonState: 'normal',
      scannedBookId: '',
      scannedStudentId: '',
      transactionMessage: '',
    };
  }

  getCameraPermissions = async (id) => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    /*status === "granted" is true when user has granted permission
        status === "granted" is false when user has not granted the permission
      */
    this.setState({
      hasCameraPermissions: status === 'granted',
      //buttonState: 'clicked',
      buttonState: id,
      scanned: false,
      scannedData: 'scanned data is here',
    });
    console.log(this.state.hasCameraPermissions);
  };

  handleBarCodeScanned = async ({ type, data }) => {
    const buttonState = this.state.buttonState;
    if (buttonState === 'BookId') {
      this.setState({
        scanned: true,
        scannedBookId: data,
        buttonState: 'normal',
      });
    } else if (buttonState === 'StudentId') {
      this.setState({
        scanned: true,
        scannedStudentId: data,
        buttonState: 'normal',
      });
    }
  };
  handleTransaction = async () => {
    //  issue,return,false
    var transactionType = await this.checkBookAvailability()
    if (!transactionType) {
      alert("the book does not exist in the library")
      this.setState({
        scannedStudentId: '',
        scannedBookId: '',
      })
    }
    else if (transactionType === "issue") {
      //  ss is expecting either true or false
      var ss = await this.checkStudentEligibilityForBookIssue()
      if (ss) {
        this.initiateBookIssue()
        alert("Book issued successfully")
      }
    }
    else if (transactionType === "return") {
      //  ss is expecting either true or false
      var ss = await this.checkStudentEligibilityForBookReturn()
      if (ss) {
        this.initiateBookReturn()
        alert("Book returned successfully")
      }
    }




    // var transactionMsg = null;
    // db.collection('books').doc(this.state.scannedBookId).get()

    //   .then((doc) => {
    //     // console.log(doc.data())
    //     var book = doc.data();
    //     if (book.bookAvailability) {
    //       this.initiateBookIssue();
    //       transactionMsg = "Book Issued"
    //       // ToastAndroid.show(transactionMsg,ToastAndroid.SHORT)
    //     }
    //     else {
    //       this.initiateBookReturn();
    //       transactionMsg = "Book returned";
    //     }
    //   })
    // this.setState({
    //   transactionMessage: transactionMsg
    //  })
  }
  initiateBookIssue = async () => {
    db.collection("transaction").add({
      'studentId': this.state.scannedStudentId,
      'bookId': this.state.scannedBookId,
      'date': firebase.firestore.Timestamp.now().toDate(),
      'transactionType': "issue"
    })
    db.collection("books").doc(this.state.scannedBookId).update({
      "bookAvailability": false
    })
    db.collection("students").doc(this.state.scannedStudentId).update({
      "noOfBooks": firebase.firestore.FieldValue.increment(1)
    })
    alert("Book is issued")
    this.setState({
      scannedStudentId: '',
      scannedBookId: '',
    })

  }

  initiateBookReturn = async () => {
    db.collection("transaction").add({
      'studentId': this.state.scannedStudentId,
      'bookId': this.state.scannedBookId,
      'date': firebase.firestore.Timestamp.now().toDate(),
      'transactionType': "return",
    })
    db.collection("books").doc(this.state.scannedBookId).update({
      "bookAvailability": true
    })
    db.collection("students").doc(this.state.scannedStudentId).update({
      "noOfBooks": firebase.firestore.FieldValue.increment(-1)
    })
    alert("Book is returned")
    this.setState({
      scannedStudentId: '',
      scannedBookId: '',
    })

  }
  checkStudentEligibilityForBookIssue = async () => {
    //collection anme incorrect
    const studentRef = await db.collection("students")
      .where("studentId", "==", this.state.scannedStudentId).get()
    var ss = ''
    if (studentRef.docs.length == 0) {
      this.setState({
        scannedStudentId: '',
        scannedBookId: '',
      })
      ss = false;
      alert("No such student exists")
    }
    else {
      studentRef.docs.map(doc => {
        var student = doc.data()
        if (student.noOfBooks < 2) {
          ss = true;
        }
        else {
          ss = false;
          alert("student has already issued 2 books")
          this.setState({
            scannedStudentId: '',
            scannedBookId: '',
          })
        }
      })
    }
    return ss
  }
  checkStudentEligibilityForBookReturn = async () => {
    const transactionRef = await db.collection("transaction")
      .where("bookId", "==", this.state.scannedBookId).limit(1).get()
    var ss = ''
    transactionRef.docs.map(doc => {
      var lastT = doc.data()
      if (lastT.studentId === this.state.scannedStudentId) {
        ss = true
      }
      else {
        ss = false
        alert("Book was not issued by this student")
        this.setState({
          scannedStudentId: '',
          scannedBookId: '',
        })
      }
    })
    return ss   
  }
  checkBookAvailability = async () => {
    const bookRef = await db.collection("books")
      .where("bookId", "==", this.state.scannedBookId).get()
      var tt = ''
    if (bookRef.docs.lenght == 0) {
      tt = false;
    }
    else{
      bookRef.docs.map(doc => {
        var bob = doc.data()
        if(bob.bookAvailability){
          tt = "issue"
        }
        else{
          tt = "return"
        }
      })
    }
    return tt
  }

  render() {
    const hasCameraPermissions = this.state.hasCameraPermissions;
    const scanned = this.state.scanned;
    const buttonState = this.state.buttonState;

    if (buttonState !== 'normal' && hasCameraPermissions) {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    } else if (buttonState === 'normal') {
      return (
        <KeyboardAvoidingView style={styles.container} behavior="padding" enabled>
          <View style={styles.container}>
            <Text style={{ textAlign: 'center', fontSize: 30 }}> WILLY </Text>
            <Image
              source={require('../assets/booklogo.jpg')}
              style={{ width: 100, height: 100 }}
            />
            <View style={styles.inputView}>
              <TextInput
                placeholder="book id"
                style={styles.inputBox}
                value={this.state.scannedBookId}
                onChangeText={(text) => { this.setState({ scannedBookId: text }) }}
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => this.getCameraPermissions('BookId')}>
                <Text style={styles.buttonText}>Scan</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputView}>
              <TextInput
                placeholder="student id"
                style={styles.inputBox}
                value={this.state.scannedStudentId}
                onChangeText={(text) => { this.setState({ scannedStudentId: text }) }}
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => this.getCameraPermissions('StudentId')}>
                <Text style={styles.buttonText}>Scan</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={async () => {
              await this.handleTransaction()
            }}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayText: {
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    margin: 10,
  },
  buttonText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
  },
  inputView: {
    flexDirection: 'row',
    margin: 20,
  },
  inputBox: {
    width: 200,
    height: 40,
    borderWidth: 1.5,
    borderRightWidth: 0,
    fontSize: 20,
    borderRadius: 10,
  },
  scanButton: {
    backgroundColor: '#66BB6A',
    width: 50,
    borderWidth: 1.5,
    borderLeftWidth: 0,
    borderRadius: 10,
  },
  submitButton: {
    backgroundColor: '#FBC02D',
    width: 170,
    height: 40,
    borderRadius: 10
  },
  submitButtonText: {
    padding: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: "bold",
    color: 'white'
  }
});
