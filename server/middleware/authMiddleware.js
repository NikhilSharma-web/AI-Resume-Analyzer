import jwt from "jsonwebtoken"

const authMiddleware = (req, res, next) =>{
    try{
        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({
                message:"Authentication required."
            })
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.userId = decoded.userId;

        next();
    } catch (error){
        console.error("Authentication Error", error)

        return res.status(401).json({
            message:("Invalid or Expired Token.")
        })
    }
}
export default authMiddleware;