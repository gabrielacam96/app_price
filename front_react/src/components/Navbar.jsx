
import { Link } from "react-router-dom";

function navbar() {
    return (
        <nav>
            <h1>Logo</h1>
            <ul>
                <li><Link to='/'>Home</Link></li>
                <li><Link to='/budget'>Budget</Link></li>
                <li><Link to='/list_budget'>List Budget</Link></li>
                <li><Link to='/grafics'>Grafics</Link></li>
            </ul>
        </nav>
    )
}

export default navbar;