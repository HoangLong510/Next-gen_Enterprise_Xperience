import {Avatar} from "@mui/material";

export default function CustomAvatar({ src, ...rest }) {

    return (
        <Avatar
            src={`${import.meta.env.VITE_SERVER_URL}/api/${src}`}
            {...rest}
        />
    )
}