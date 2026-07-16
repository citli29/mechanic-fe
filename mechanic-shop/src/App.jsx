import { BrowserRouter, Routes, Route } from "react-router-dom";
import MakesList from "./pages/Makes/MakesList";
import ModelsList from "./pages/Models/ModelsList";
import CarsList from "./pages/Cars/CarsList";
import CarShow from "./pages/Cars/CarShow";
import "./style/crud.css"
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/makes" element={<MakesList />} />
        <Route path="/models" element={<ModelsList />} />
        <Route path="/cars" element={<CarsList />} />
        <Route path="/cars/:id" element={<CarShow />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
