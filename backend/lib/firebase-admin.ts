import admin from 'firebase-admin';

const serviceAccount = {
  "type": "service_account",
  "project_id": "beer-app-44415",
  "private_key_id": "e1fa844d406d9455ca94f0352f8f912b2494f813",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDPYBTlsGwl8pp0\nyoF9Z+ihDjgfL0r0/xnqtFJRD9rn7NksxIAiDzrKGh+jIgFlQ88PKVIcT535JJhP\nHGCQA1okAAUdQEGGSJ3SOXK8xMhYgG1aJwQrDUbVta/gSoruA5uOOPFQkrxGd9/s\nCM4dsaInqOGN692V21JQJ4DZHxQmOYuTy2Yi2UOfOeDjopBDHcnjZtS7h6n3laHY\nb3/+f6h5hVJzW66k79D0/kkr2iKvBdk+QLsL94txy/b2uF/5Vs6hQ8ej/WzVRScd\n7hBpSSaRzkl8Cy2gihqrwEbEbsQkn0uzA1JW7TbgpuwQtHZhb5Wlt3gIpuVs0oit\n8ikXfFtbAgMBAAECggEAVrlgU+RRfhc0p/YObDMZ0szfBI+jIc1Tedeae0MNsaNX\n+YRd76B93gpJw8/TVJWkkLsfly5mqsw2lBMSgPed6WNGwEJghLd2pPWYecAz5usi\nkCqz8As33eUDHeIessY4diRzKtaKvU+hihTumfVxEnPqjA8hVmvnwxSaKnL4WrlB\necYlRQ2Dldkyeb3tk7ZlakzS9zOFkX/OgUNLEBDcujPrp8dYR2EZLMFRdEGjZaZs\nvC8KoFI3dnL+aJ3sqMGY0LL3fCNuJvcEC2V9ww0pkFx3ekhgiTWXnnPa6DYd3tWt\n2MiWn6zh+yuQNg7CqYDw1cubGWq/V36E02XoJl77HQKBgQD94gXEqi/ULKm7eAjq\n39ZBNx3rs813wI9BIOGPwIowTyL8X7eDmuMbhWGxldWQL+NzoKN7tKghdrIyQF0q\nSx9yeWe1GNhn6HHsyCVv8NBjZkxEV+yd7IDD3pkjCrL41dVazbiy0TQSi4hJELKQ\ngMTEFrFAtqOBINWyNmrVBlN7TQKBgQDRGsbgloVUDGTZkj9X/IK/MRObLnU2xw+3\n4JgHH3esYN7f46/mNizkFXdsnnTGEBiXKVFR+NPoDYZ0tbfQRz1KYME2Sxj3ntqI\nNS4pTwO76+dFz/xxMRJvBCebnqLzy27LbAFuiJmbXhFFhOLBMLbm7EME5TnMPr59\n1emMTbtNRwKBgFO0+gHluu9R6oSNByOpuZK3AX59QfmB27m1halH6kgTT422YWNa\n5hZk29kZddiccXnmNQDMh8LAx/AZmJ4hNrUfojnrfy6DTUyskOtfktWzHOJLuxA2\nsh3ifss289tnZXkS6xrKL0kOCFlO0BEk47tjX/3eOfqRQOQJXR/vfgbhAoGBAJnl\npT2iSpqjTI487tXpCKmCizWJKceZFl50tC9533BFE4OgZdN/R+bOTcjpjnQ/YHnQ\ndQNpqTx+x9iZ7aEi7V8SeuFkwAlvJtNcoI7SkqL6aoqdGuSMA08ltaj5RmE79l1N\nLniVnMgWoYuS0/jvy42FkYXG15UVEMo4Z91VUGb9AoGAf59b1ulodBWhd9ySfoi8\nh/JDekSJGuv6DdmOMVrbLHVDFTfcsUsee/ymgrGI5NlM3r1rQn/0qBvnL6lV+zSi\nW1rynDQIwfVmuBmauPfufbG2HMOuER0zouBeNSSN8SF5H1S5rE5xcGVeI4+l/+GT\n4jIzscHnu6bYWVG7HIxdch8=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@beer-app-44415.iam.gserviceaccount.com",
  "client_id": "104088011893361963238",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40beer-app-44415.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: 'beer-app-44415',
    storageBucket: 'beer-app-44415.firebasestorage.app'
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
export default admin;