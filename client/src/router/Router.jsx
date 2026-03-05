import { BrowserRouter, Routes, Route } from "react-router-dom";
import NewDebate from "../pages/debate/NewDebate";

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NewDebate />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;