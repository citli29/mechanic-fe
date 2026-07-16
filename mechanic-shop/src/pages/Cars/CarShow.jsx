import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import "./CarShow.css";

export default function CarShow() {
  const { id } = useParams();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCar = async () => {
      try {
        const response = await api.get(`/cars/${id}`);
        setCar(response.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load car.");
      } finally {
        setLoading(false);
      }
    };

    fetchCar();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!car) return <p>Car not found.</p>;

  return (
    <div className="car-show">
      <h1>{car.plate}</h1>

      <table className="details-table">
        <tbody>
          <tr>
            <th>Plate</th>
            <td>{car.plate}</td>
          </tr>

          <tr>
            <th>Make</th>
            <td>{car.make_name}</td>
          </tr>

          <tr>
            <th>Model</th>
            <td>{car.model_name}</td>
          </tr>

          <tr>
            <th>Year</th>
            <td>{car.year}</td>
          </tr>

          <tr>
            <th>Month</th>
            <td>{car.month}</td>
          </tr>

          <tr>
            <th>Engine CC</th>
            <td>{car.cc}</td>
          </tr>

          <tr>
            <th>Engine Code</th>
            <td>{car.engine_code}</td>
          </tr>

          <tr>
            <th>Color Code</th>
            <td>{car.color_code}</td>
          </tr>

          <tr>
            <th>Chassis Number</th>
            <td>{car.chassi_nr}</td>
          </tr>

          <tr>
            <th>Make ID</th>
            <td>{car.make_id}</td>
          </tr>

          <tr>
            <th>Model ID</th>
            <td>{car.model_id}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
