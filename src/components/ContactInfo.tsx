import React from "react";
import { Typography, Link, Box } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import ColorSelector from "./ColorSelector";

const ContactInfo: React.FC = () => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
        För att beställa, vänligen kontakta oss via Instagram eller Facebook.
      </Typography>
      <ColorSelector />

      <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
        Du kan även välja mellan silver- eller guldfärg på kroken.
      </Typography>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Link
          href="https://instagram.com/cutie.poppers"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            textDecoration: "none",
            color: "#E4405F", // Instagram brand color
            fontWeight: "medium",
            "&:hover": {
              textDecoration: "underline",
              color: "#C13584", // Darker Instagram color on hover
            },
          }}
        >
          <InstagramIcon />
          <Typography variant="body2">Följ oss på Instagram</Typography>
        </Link>

        <Link
          href="https://www.facebook.com/people/Cutie-poppers/61575606763052/"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            textDecoration: "none",
            color: "#1877F2", // Facebook brand color
            fontWeight: "medium",
            "&:hover": {
              textDecoration: "underline",
              color: "#166FE5", // Darker Facebook color on hover
            },
          }}
        >
          <FacebookIcon />
          <Typography variant="body2">Följ oss på Facebook</Typography>
        </Link>
      </Box>
    </Box>
  );
};

export default ContactInfo;
