import { BrowserRouter, Routes, Route } from "react-router-dom";
import CarsList from "./pages/Cars/CarsList";
import CarShow from "./pages/Cars/CarShow";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cars" element={<CarsList />} />
        <Route path="/cars/:id" element={<CarShow />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
