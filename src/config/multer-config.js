const multer = require('multer');
const path = require('path');

const createStorage = (folderName) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, `../../uploads/${folderName}/`))
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname))
    }
  });
};

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

const itemStorage = createStorage('itemuploads');
const userStorage = createStorage('useruploads');
const credentialStorage = createStorage('credentialuploads');
const companyStorage = createStorage('companyuploads');
const featuredProductStorage = createStorage('featuredproducts');
const paymentProofStorage = createStorage('paymentproofs');
const investorDocumentStorage = createStorage('investordocuments');
const borrowerDocumentStorage = createStorage('borrowerdocuments');

const itemUpload = multer({
  storage: itemStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const userUpload = multer({
  storage: userStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const credentialUpload = multer({
  storage: credentialStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const companyUpload = multer({
  storage: companyStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const featuredProductUpload = multer({
  storage: featuredProductStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const paymentProofUpload = multer({
  storage: paymentProofStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Document upload for investors and borrowers (supports image file types only)
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/jpg'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPEG, PNG, and JPG images are allowed.'), false);
  }
};

const investorDocumentUpload = multer({
  storage: investorDocumentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for documents
  }
});

const borrowerDocumentUpload = multer({
  storage: borrowerDocumentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for documents
  }
});

const videoStorage = createStorage('videos');

const videoFileFilter = (req, file, cb) => {
  if (file.mimetype === 'video/mp4') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only MP4 videos are allowed.'), false);
  }
};

const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
}).single('video');

const handleVideoUpload = (req, res, next) => {
  videoUpload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size limit exceeded. Maximum file size allowed is 50MB.'
        });
      }
      return res.status(400).json({
        error: 'Video upload error: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        error: err.message
      });
    }
    next();
  });
};

module.exports = {
  itemUpload,
  userUpload,
  credentialUpload,
  companyUpload,
  featuredProductUpload,
  paymentProofUpload,
  investorDocumentUpload,
  borrowerDocumentUpload,
  videoUpload: handleVideoUpload
};