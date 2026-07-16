import { BrowserRouter, Routes, Route } from "react-router-dom";
import MakesList from "./pages/Makes/MakesList";
import ModelsList from "./pages/Models/ModelsList";
import CarsList from "./pages/Cars/CarsList";
import ProductTypesList from "./pages/ProductTypes/ProductTypesList.jsx";
import ProductsList from "./pages/Products/ProductsList.jsx";

import "./style/crud.css"
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/makes" element={<MakesList />} />
        <Route path="/models" element={<ModelsList />} />
        <Route path="/cars" element={<CarsList />} />
        <Route path="/product_types" element={<ProductTypesList />} />
        <Route path="/products" element={<ProductsList />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
