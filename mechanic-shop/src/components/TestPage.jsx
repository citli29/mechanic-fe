import { useCallback, useEffect, useState ,useRef } from "react";
import CarPicker from "./Pickers/CarPicker";


export default function TestPage() {

	const [selectedCar, setSelectedCar] = useState(null);

	return (
		<div >
			<CarPicker/>
		</div>
	);
}


