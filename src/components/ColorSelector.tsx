import React from "react";
import { Box, Typography, Chip } from "@mui/material";

const colors = [
  { name: "Svart", value: "black", color: "#000000" },
  { name: "Grå", value: "grey", color: "#808080" },
  { name: "Gul", value: "yellow", color: "#FFD700" },
  { name: "Vit", value: "white", color: "#FFFFFF" },
  { name: "Röd", value: "red", color: "#FF0000" },
  { name: "Lila", value: "purple", color: "#800080" },
  { name: "Rosa", value: "pink", color: "#FFC0CB" },
  { name: "Grön", value: "green", color: "#008000" },
  { name: "Blå", value: "blue", color: "#0000FF" },
  { name: "Orange", value: "orange", color: "#FFA500" },
];

const ColorSelector: React.FC = () => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body1" sx={{ mb: 2, fontWeight: "medium" }}>
        Tillgängliga färger:
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          maxHeight: "200px",
          overflowY: "auto",
          backgroundColor: "white",
          borderRadius: 2,
          p: 2,
          boxShadow: 1,
        }}
      >
        {colors.map((color) => (
          <Chip
            key={color.value}
            label={color.name}
            sx={{
              backgroundColor: color.color,
              color: color.value === "white" ? "#000000" : "#FFFFFF",
              border: color.value === "white" ? "1px solid #ccc" : "none",
              fontWeight: "medium",
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ColorSelector;
