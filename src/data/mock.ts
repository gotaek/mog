import { Event } from '@/types';

export const INITIAL_EVENTS: Event[] = [
  {
    id: 1,
    title: "듄: 파트 2",
    cinema: "CGV",
    goodsType: "TTT (That's The Ticket)",
    period: "2024.02.28 ~ 소진 시",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000&auto=format&fit=crop",
    locations: ["용산아이파크몰", "영등포", "왕십리", "판교", "천안펜타포트"],
    officialUrl: "https://www.cgv.co.kr/culture-event/event/",
    status: "진행중"
  },
  {
    id: 2,
    title: "파묘",
    cinema: "메가박스",
    goodsType: "오리지널 티켓",
    period: "2024.02.22 ~ 소진 시",
    imageUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1000&auto=format&fit=crop",
    locations: ["코엑스", "성수", "홍대", "목동", "고양스타필드"],
    officialUrl: "https://www.megabox.co.kr/event",
    status: "진행중"
  },
  {
    id: 3,
    title: "가여운 것들",
    cinema: "롯데시네마",
    goodsType: "아트카드",
    period: "2024.03.06 ~ 소진 시",
    imageUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1000&auto=format&fit=crop",
    locations: ["월드타워", "건대입구", "신림", "노원", "수원"],
    officialUrl: "https://www.lottecinema.co.kr/NLCHS/Event",
    status: "예정"
  },
  {
    id: 4,
    title: "스파이더맨: 어크로스 더 유니버스",
    cinema: "CGV",
    goodsType: "IMAX 한정판 포스터",
    period: "2024.03.10 ~ 소진 시",
    imageUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=1000&auto=format&fit=crop",
    locations: ["전국 IMAX 상영관"],
    officialUrl: "https://www.cgv.co.kr/culture-event/event/",
    status: "진행중"
  },
  {
    id: 5,
    title: "웡카",
    cinema: "메가박스",
    goodsType: "돌비 시네마 포스터",
    period: "2024.01.31 ~ 소진 시",
    imageUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1000&auto=format&fit=crop",
    locations: ["코엑스", "안성스타필드", "남양주현대아울렛"],
    officialUrl: "https://www.megabox.co.kr/event",
    status: "마감임박"
  }
];
