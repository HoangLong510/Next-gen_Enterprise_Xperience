import React, { useEffect, useState } from "react";
import { Grid, Paper, Typography } from "@mui/material";
import { getFundSummaryApi } from "~/services/accountant/fund.service";


const AccountDashboard = ({ accessToken }) => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const res = await getFundSummaryApi(accessToken);
      if (res?.status === 200) {
        setSummary(res.data);
      }
    };
    fetchSummary();
  }, [accessToken]);

  if (!summary) return <Typography>Loading...</Typography>;

  const cards = [
    { label: "Tổng số quỹ", value: summary.totalFunds },
    { label: "Tổng số dư", value: summary.totalBalance },
    { label: "Đang hoạt động", value: summary.activeFunds },
    { label: "Đã khóa", value: summary.lockedFunds }
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((c, i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              textAlign: "center",
              bgcolor: "#f5f5f5"
            }}
          >
            <Typography variant="subtitle1">{c.label}</Typography>
            <Typography variant="h4" fontWeight="bold">{c.value}</Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default AccountDashboard;
