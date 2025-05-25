# HEAL Backend

HEAL backend system for a health-oriented platform that facilitates doctor-patient interaction, appointment scheduling, real-time communication, medical record management, and AI-enhanced services like transcriptions and chat.

## 📦 Tech Stack

- **Node.js** + **Express**
- **TypeScript**
- **MongoDB** + **Mongoose**
- **Socket.IO** – real-time chat
- **JWT Authentication**
- **BcryptJS** – password hashing
- **Multer** – file uploads
- **Square API** – payments
- **Google Generative AI** + **Deepgram** – transcription and AI
- **Dotenv** – environment config

---

## 🚀 Getting Started

### 🔧 Prerequisites

- Node.js (v18+ recommended)
- MongoDB instance (local or cloud)
- API keys for:
  - Google Generative AI
  - Deepgram
  - Square

### 📁 Clone the Repository

```bash
git clone https://github.com/AryanPahuja21/heal-backend.git
cd heal-backend
````

### 📦 Install Dependencies

```bash
npm install
```

---

## ⚙️ Running the Server

### Development

```bash
npm run dev
```

---

## 🧪 Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GOOGLE_API_KEY=your_google_ai_key
DEEPGRAM_API_KEY=your_deepgram_api_key
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_LOCATION_ID=your_square_location_id
SQUARE_ENVIRONMENT=sandbox
```

---

## 🧪 API Routes

> Use Postman or any REST client to test routes.

Common modules:

* `auth/` – Login, Register
* `appointments/` – CRUD for appointments
  ![image](https://github.com/user-attachments/assets/0d4f2e28-111a-4637-a311-935034178652)
  ![image](https://github.com/user-attachments/assets/3eaddff5-bffe-4d39-87ff-248613431919)
  ![image](https://github.com/user-attachments/assets/29fa1fa4-5319-4f9d-84ac-0f7a15206959)
  
* `users/` – Patient & doctor info
* `records/` – Medical records
  ![image](https://github.com/user-attachments/assets/8b0cbfe7-9272-43c2-a923-b770ad94a182)
  ![image](https://github.com/user-attachments/assets/76e0e121-7f16-4eea-8da3-0b656f5b6c54)
  ![image](https://github.com/user-attachments/assets/25ccb229-11f1-4592-8a49-8689666e2b81)
  ![image](https://github.com/user-attachments/assets/91823315-833c-4e23-9105-459303822693)

* `prescriptions/` – Upload/download prescriptions
  ![image](https://github.com/user-attachments/assets/1955cbed-e656-4847-b5c6-410d5e08485f)

* `payments/` – Powered by Square
* `transcriptions/` – Audio to text (Deepgram)
* `ai/` – Google Generative AI responses

---

## 🛠 Scripts

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `npm run dev`   | Run in development with hot reload |\

---

