// import ChartDataLabels from "chartjs-plugin-datalabels";
var ctx = $('.graph');

var color = ["#A06AFF"];

var colorend = ['#FF6AD4'];

var color2 = ['#616366'];


var set_num = 0;
var set_num2 = 0;


const data = {
  labels: ['12월' , '1월' , '2월' , '3월' , '4월' , '5월' , '6월' , '7월' , '8월' , '9월', '10월' , '11월'],
  datasets: [
    {
      label : "",
      data: [20,35,40,55,20,60 , 60 , 60 , 60 , 60 , 60 , 60],
      borderColor: function(context) {
        const chart = context.chart;
        const {ctx, chartArea} = chart;

        if (!chartArea) {
          // This case happens on initial chart load
          return;
        }
        return getGradient(ctx, chartArea);
      },
      backgroundColor: function(context) {
        const chart = context.chart;
        const {ctx, chartArea} = chart;

        if (!chartArea) {
          // This case happens on initial chart load
          return;
        }
        return getGradient(ctx, chartArea);
      },
      borderWidth: 2,
      borderRadius: Number.MAX_VALUE - 45,
      borderSkipped: false,
      minBarLength: 10,
      maxBarThickness : 13, 
      color : color2 ,
    },
  ]
};

let height, gradient;
function getGradient(ctx, chartArea) {
  const chartHeight = chartArea.bottom - chartArea.top;
  if (height !== chartHeight) {
    // Create the gradient because this is either the first render
    // or the size of the chart has changed
    height = chartHeight;
    gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, color);
    // gradient.addColorStop(0.8, colorend);
    gradient.addColorStop(1, colorend);
  }

  return gradient;
}  


new Chart(ctx, {
  plugins:[ChartDataLabels],
  type: 'bar',
  data: data,
  options: {
    layout: {
      padding: {
          top: 15
      }
    },
    scales: {
      x: {
        ticks: {
          color: color2,  
          font: {
            size: 12,
            weight : 600,
          },
          stepSize: 1,
          beginAtZero: true
        },
        border: {
          display: false
        },
        grid: {
          display: false,
          drawOnChartArea: false,
          drawTicks: false,
        },
            

      },
      y: {
        ticks: {
          display : false,
        },
        beginAtZero: true,
        stepSize : 2,
                    fontSize : 10,
        color : color,
        border: {
          display: false
        },
        grid: {
          display: false,
          drawOnChartArea: false,
          drawTicks: false,
        }
        
      },
    },
    responsive: false,
    

    plugins: {
      legend : {
        display : false,
        labels: {
          color: color2,
        },
      },
        datalabels: {
            
            display: false,
            color: color,
            weight : '700',
            anchor: "end",
            align: "end",
        },
    },
  }
});

