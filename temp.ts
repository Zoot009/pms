import prisma from "./lib/prisma";

const getData = async () => {
  const data = await prisma.order.findUnique({
    where:{
      // customerName: "sfelsman",
      orderNumber: "#FO528C69FE3C7"
    }
  })
  console.log(data)
}

getData()