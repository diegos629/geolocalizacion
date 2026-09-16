import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDm9YmmIVha1eqUKHzMnYmbBYD297r2Xe0',
  authDomain: 'geocritico.firebaseapp.com',
  projectId: 'geocritico',
  storageBucket: 'geocritico.firebasestorage.app',
  messagingSenderId: '934573092451',
  appId: '1:934573092451:web:f10e7e3fc735b908b35256',
  measurementId: 'G-FHSMYG7NT2'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.gmacFirebaseReady = Promise.resolve({
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc
});
