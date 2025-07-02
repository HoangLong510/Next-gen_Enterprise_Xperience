import {Avatar, styled, alpha} from "@mui/material";

const StyledAvatar = styled(Avatar)(({theme}) => ({
    width: 30,
    height: 30,
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    fontWeight: 700,
    fontSize: "14px",
    border: `3px solid ${theme.palette.background.paper}`,
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
    transition: theme.transitions.create(["transform", "box-shadow"], {
        duration: theme.transitions.duration.short,
        easing: theme.transitions.easing.easeInOut
    }),
    position: "relative",
    zIndex: 1,

    "&::after": {
        content: '""',
        position: "absolute",
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.3
        )} 0%, ${alpha(theme.palette.primary.light, 0.2)} 100%)`,
        borderRadius: "50%",
        opacity: 0,
        transition: theme.transitions.create("opacity", {
            duration: theme.transitions.duration.short
        }),
        zIndex: -1
    },

    "&:hover::after": {
        opacity: 1
    }
}))

export default function CustomAvatar({ src, firstName, lastName, size, ...rest }) {
    const initials = `${firstName?.[0] || ""}${
        lastName?.[0] || ""
    }`

    return (
        <StyledAvatar
            sx={{ width: size, height: size }}
            src={`${import.meta.env.VITE_SERVER_URL}/api/${src}`}
            {...rest}
        >
            {initials}
        </StyledAvatar>
    )
}