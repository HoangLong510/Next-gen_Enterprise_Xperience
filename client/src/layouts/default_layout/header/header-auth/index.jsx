import React from "react"
import {
    Box,
    ListItemIcon,
    Menu,
    MenuItem,
    Typography,
    Chip,
    ButtonBase,
    Switch,
    alpha,
    styled
} from "@mui/material"

import Logout from "@mui/icons-material/Logout"
import Person from "@mui/icons-material/Person"
import Lock from "@mui/icons-material/Lock"
import Language from "@mui/icons-material/Language"
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown"

import {useDispatch, useSelector} from "react-redux"
import {setPopupLogout} from "~/libs/features/popupLogout/popupLogoutSlice"
import {useTranslation} from "react-i18next"
import {useNavigate} from "react-router-dom"
import CustomAvatar from "~/components/custom-avatar/index.jsx";

const StyledHeaderButton = styled(ButtonBase)(({theme, open}) => ({
    borderRadius: 28,
    padding: "8px 20px 8px 8px",
    background: `linear-gradient(135deg, ${alpha(
        theme.palette.background.paper,
        0.8
    )} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
    backdropFilter: "blur(12px)",
    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    boxShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.08)}`,
    transition: theme.transitions.create(
        ["all", "transform", "box-shadow", "background"],
        {
            duration: theme.transitions.duration.short,
            easing: theme.transitions.easing.easeInOut
        }
    ),
    position: "relative",
    overflow: "hidden",

    "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.05
        )} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
        opacity: 0,
        transition: theme.transitions.create("opacity", {
            duration: theme.transitions.duration.short
        }),
        zIndex: 0
    },

    "&:hover": {
        transform: "scale(0.98)",
        boxShadow: `0 8px 25px ${alpha(theme.palette.common.black, 0.15)}`,
        background: `linear-gradient(135deg, ${alpha(
            theme.palette.background.paper,
            0.95
        )} 0%, ${theme.palette.background.paper} 100%)`,
        borderColor: alpha(theme.palette.primary.main, 0.2),

        "&::before": {
            opacity: 1
        },

        "& .dropdown-arrow": {
            color: theme.palette.primary.main,
            transform: "scale(1.1)"
        }
    },

    "&:active": {
        transform: "translateY(0px)"
    },

    ...(open && {
        background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.08
        )} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
        borderColor: alpha(theme.palette.primary.main, 0.3),
        boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,

        "&::before": {
            opacity: 1
        },

        "& .dropdown-arrow": {
            color: theme.palette.primary.main,
            transform: "rotate(180deg) scale(1.1)"
        }
    })
}))

export default function HeaderAuth() {
    const {t, i18n} = useTranslation("header")
    const navigate = useNavigate()
    const account = useSelector((state) => state.account.value)
    const dispatch = useDispatch()

    const [anchorEl, setAnchorEl] = React.useState(null)
    const [isVietnamese, setIsVietnamese] = React.useState(
        i18n.language === "vi"
    )
    const open = Boolean(anchorEl)

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleLanguageToggle = (event) => {
        event.stopPropagation()
        const newLanguage = !isVietnamese
        setIsVietnamese(newLanguage)
        i18n.changeLanguage(newLanguage ? "vi" : "en")
    }

    if (!account) {
        return null
    }

    const fullName = `${account.firstName} ${account.lastName}`

    return (
        <React.Fragment>
            <StyledHeaderButton
                onClick={handleClick}
                aria-controls={open ? "account-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
                open={open}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        position: "relative",
                        zIndex: 1
                    }}
                >
                    <Box sx={{position: "relative"}}>
                        <CustomAvatar
                            src={account.avatar}
                            firstName={account.firstName}
                            lastName={account.lastName}
                        />
                    </Box>

                    <Box
                        sx={{
                            display: {xs: "none", md: "block"},
                            textAlign: "left",
                            minWidth: 0
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 500,
                                color: "text.primary",
                                lineHeight: 1.2,
                                textTransform: "capitalize",
                                fontSize: "0.9rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 120
                            }}
                        >
                            {fullName}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: "text.secondary",
                                lineHeight: 1.2,
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 120,
                                display: "block"
                            }}
                        >
                            @{account.username}
                        </Typography>
                    </Box>

                    <KeyboardArrowDown
                        className="dropdown-arrow"
                        fontSize="small"
                        sx={{
                            color: "text.secondary",
                            transition: (theme) =>
                                theme.transitions.create(
                                    ["transform", "color"],
                                    {
                                        duration:
                                        theme.transitions.duration.short,
                                        easing: theme.transitions.easing
                                            .easeInOut
                                    }
                                ),
                            ml: 0.5
                        }}
                    />
                </Box>
            </StyledHeaderButton>

            <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleClose}
                slotProps={{
                    paper: {
                        elevation: 0,
                        sx: {
                            overflow: "visible",
                            filter: "drop-shadow(0px 12px 40px rgba(0,0,0,0.15))",
                            mt: 1.5,
                            minWidth: 280,
                            borderRadius: 3,
                            border: `1px solid ${alpha("#000", 0.08)}`,
                            background: `linear-gradient(135deg, ${alpha(
                                "#fff",
                                0.95
                            )} 0%, ${alpha("#fff", 0.98)} 100%)`,
                            backdropFilter: "blur(20px)",
                            "&::before": {
                                content: '""',
                                display: "block",
                                position: "absolute",
                                top: 0,
                                right: 24,
                                width: 12,
                                height: 12,
                                background: `linear-gradient(135deg, ${alpha(
                                    "#fff",
                                    0.95
                                )} 0%, ${alpha("#fff", 0.98)} 100%)`,
                                transform: "translateY(-50%) rotate(45deg)",
                                border: `1px solid ${alpha("#000", 0.08)}`,
                                borderBottom: "none",
                                borderRight: "none",
                                zIndex: 0
                            }
                        }
                    }
                }}
                transformOrigin={{horizontal: "right", vertical: "top"}}
                anchorOrigin={{horizontal: "right", vertical: "bottom"}}
            >
                {/* User Info Header */}
                <Box
                    sx={{
                        p: 3,
                        background: (theme) =>
                            `linear-gradient(135deg, ${alpha(
                                theme.palette.primary.main,
                                0.05
                            )} 0%, ${alpha(
                                theme.palette.primary.light,
                                0.02
                            )} 100%)`,
                        borderRadius: 2,
                        margin: 2,
                        marginBottom: 1,
                        border: (theme) =>
                            `1px solid ${alpha(
                                theme.palette.primary.main,
                                0.08
                            )}`
                    }}
                >
                    <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                        <Box sx={{position: "relative"}}>
                            <CustomAvatar
                                src={account.avatar}
                                firstName={account.firstName}
                                lastName={account.lastName}
                                sx={{
                                    width: 45,
                                    height: 45,
                                    fontSize: "22px"
                                }}
                            />
                        </Box>
                        <Box sx={{flex: 1, minWidth: 0}}>
                            <Typography
                                variant="body1"
                                sx={{
                                    fontWeight: 500,
                                    color: "text.primary",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    textTransform: "capitalize",
                                    fontSize: "1rem"
                                }}
                            >
                                {fullName}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: "text.secondary",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    display: "block",
                                    fontSize: "0.85rem",
                                    fontWeight: 500
                                }}
                            >
                                @{account.username}
                            </Typography>
                            <Chip
                                label={t(account.role)}
                                size="small"
                                sx={{
                                    mt: 1,
                                    height: 24,
                                    fontSize: "0.75rem",
                                    background: (theme) =>
                                        `linear-gradient(135deg, ${alpha(
                                            theme.palette.primary.main,
                                            0.1
                                        )} 0%, ${alpha(
                                            theme.palette.primary.light,
                                            0.05
                                        )} 100%)`,
                                    color: "primary.main",
                                    fontWeight: 600,
                                    textTransform: "capitalize",
                                    border: (theme) =>
                                        `1px solid ${alpha(
                                            theme.palette.primary.main,
                                            0.2
                                        )}`
                                }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Language Toggle */}
                <Box
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        margin: "8px 16px",
                        background: (theme) =>
                            `linear-gradient(135deg, ${alpha(
                                theme.palette.primary.main,
                                0.05
                            )} 0%, ${alpha(
                                theme.palette.primary.light,
                                0.02
                            )} 100%)`,
                        border: (theme) =>
                            `1px solid ${alpha(
                                theme.palette.primary.main,
                                0.08
                            )}`,
                        transition: "all 0.2s ease-in-out"
                    }}
                >
                    <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                        <ListItemIcon sx={{minWidth: "auto"}}>
                            <Language
                                fontSize="small"
                                sx={{color: "primary.main"}}
                            />
                        </ListItemIcon>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                flex: 1
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    fontSize: "0.875rem",
                                    fontWeight: 600,
                                    color: isVietnamese
                                        ? "text.secondary"
                                        : "primary.main"
                                }}
                            >
                                🇺🇸 EN
                            </Typography>
                            <Switch
                                checked={isVietnamese}
                                onChange={handleLanguageToggle}
                                size="small"
                                sx={{
                                    "& .MuiSwitch-switchBase.Mui-checked": {
                                        color: "primary.main"
                                    },
                                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                        {
                                            backgroundColor: "primary.main"
                                        }
                                }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    fontSize: "0.875rem",
                                    fontWeight: 600,
                                    color: isVietnamese
                                        ? "primary.main"
                                        : "text.secondary"
                                }}
                            >
                                🇻🇳 VI
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <MenuItem
                    onClick={() => {
                        navigate("/profile")
                        handleClose()
                    }}
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        margin: "4px 16px",
                        transition: "all 0.2s ease-in-out",
                        color: "text.secondary",
                        "&:hover": {
                            backgroundColor: (theme) =>
                                alpha(theme.palette.primary.main, 0.08),
                            color: "primary.main",
                            transform: "translateX(4px)",
                            "& .MuiListItemIcon-root": {
                                color: "primary.main",
                                transform: "scale(1.1)"
                            }
                        }
                    }}
                >
                    <ListItemIcon
                        sx={{
                            color: "text.secondary",
                            transition: "all 0.2s ease-in-out"
                        }}
                    >
                        <Person fontSize="small"/>
                    </ListItemIcon>
                    <Typography
                        variant="body2"
                        sx={{fontSize: "0.875rem", fontWeight: 500}}
                    >
                        {t("view-profile")}
                    </Typography>
                </MenuItem>

                <MenuItem
                    onClick={handleClose}
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        margin: "4px 16px",
                        transition: "all 0.2s ease-in-out",
                        color: "text.secondary",
                        "&:hover": {
                            backgroundColor: (theme) =>
                                alpha(theme.palette.primary.main, 0.08),
                            color: "primary.main",
                            transform: "translateX(4px)",
                            "& .MuiListItemIcon-root": {
                                color: "primary.main",
                                transform: "scale(1.1)"
                            }
                        }
                    }}
                >
                    <ListItemIcon
                        sx={{
                            color: "text.secondary",
                            transition: "all 0.2s ease-in-out"
                        }}
                    >
                        <Lock fontSize="small"/>
                    </ListItemIcon>
                    <Typography
                        variant="body2"
                        sx={{fontSize: "0.875rem", fontWeight: 500}}
                    >
                        {t("change-password")}
                    </Typography>
                </MenuItem>

                <MenuItem
                    onClick={() => dispatch(setPopupLogout())}
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        margin: "4px 16px",
                        transition: "all 0.2s ease-in-out",
                        color: "text.secondary",
                        "&:hover": {
                            backgroundColor: (theme) =>
                                alpha(theme.palette.error.main, 0.08),
                            color: "error.main",
                            transform: "translateX(4px)",
                            "& .MuiListItemIcon-root": {
                                color: "error.main",
                                transform: "scale(1.1)"
                            }
                        }
                    }}
                >
                    <ListItemIcon
                        sx={{
                            color: "text.secondary",
                            transition: "all 0.2s ease-in-out"
                        }}
                    >
                        <Logout fontSize="small"/>
                    </ListItemIcon>
                    <Typography
                        variant="body2"
                        sx={{fontSize: "0.875rem", fontWeight: 500}}
                    >
                        {t("logout")}
                    </Typography>
                </MenuItem>
            </Menu>
        </React.Fragment>
    )
}
