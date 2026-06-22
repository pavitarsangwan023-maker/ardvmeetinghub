import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Clock, Video, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { schedulerApi } from "../services/api";

export function PublicBookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"idle" | "booking" | "success">("idle");
  const [bookedMeetingId, setBookedMeetingId] = useState("");

  useEffect(() => {
    if (!slug) return;
    schedulerApi.getPublicProfile(slug)
      .then(({ data }) => setProfile(data))
      .catch((err) => setError("Booking page not found or unavailable."))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (selectedDate && slug) {
      setSlotsLoading(true);
      const tzOffset = selectedDate.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(selectedDate.getTime() - tzOffset)).toISOString().split('T')[0];
      
      schedulerApi.getAvailableSlots(slug, localISOTime)
        .then(({ data }) => setSlots(data))
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false));
    }
  }, [selectedDate, slug]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !selectedDate || !selectedTime || !guestName || !guestEmail) return;
    
    setBookingStatus("booking");
    try {
      const tzOffset = selectedDate.getTimezoneOffset() * 60000;
      const localISODate = (new Date(selectedDate.getTime() - tzOffset)).toISOString().split('T')[0];
      
      const { data } = await schedulerApi.bookSlot(slug, {
        date: localISODate,
        start_time: selectedTime,
        guest_name: guestName,
        guest_email: guestEmail
      });
      setBookedMeetingId(data.meeting_id);
      setBookingStatus("success");
    } catch (err: any) {
      alert("Failed to book: " + (err.response?.data?.detail || err.message));
      setBookingStatus("idle");
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 = Mon, 6 = Sun
  };

  const formatTime12h = (time24: string) => {
    const [h, m] = time24.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${m} ${ampm}`;
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const isPast = d < today;
      const isSelected = selectedDate?.toDateString() === d.toDateString();
      
      days.push(
        <button
          key={`day-${i}`}
          disabled={isPast}
          onClick={() => { setSelectedDate(d); setSelectedTime(null); }}
          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
            ${isPast ? "text-slate-600 cursor-not-allowed" : 
              isSelected ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/30 scale-110" : 
              "text-slate-200 hover:bg-slate-800"}`}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  if (loading) return <div className="bg-slate-950 min-h-screen flex items-center justify-center text-white">Loading...</div>;
  if (error || !profile) return <div className="bg-slate-950 min-h-screen flex items-center justify-center text-white"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Oops!</h1><p className="text-slate-400">{error}</p></div></div>;

  if (bookingStatus === "success") {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900 border-slate-800">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">You are scheduled</h1>
          <p className="text-slate-300 mb-6">A calendar invitation has been sent to your email address.</p>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-8 text-left space-y-2">
            <p className="font-semibold text-white">{profile.title} with {profile.host_name}</p>
            <p className="text-sm text-slate-400 flex items-center gap-2"><CalendarIcon size={14}/> {selectedDate?.toLocaleDateString()}</p>
            <p className="text-sm text-slate-400 flex items-center gap-2"><Clock size={14}/> {selectedTime ? formatTime12h(selectedTime) : ""}</p>
            <p className="text-sm text-slate-400 flex items-center gap-2"><Video size={14}/> PyMeet Video Call</p>
          </div>
          <Button variant="primary" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white" onClick={() => navigate(`/meeting/${bookedMeetingId}`)}>Join Meeting Now</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen flex items-center justify-center p-4 py-12">
      <Card className="max-w-5xl w-full flex flex-col md:flex-row overflow-hidden bg-slate-900 border-slate-800 shadow-2xl shadow-fuchsia-900/10">
        
        {/* Left Panel: Profile Info */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-800 p-8 bg-slate-900/50">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{profile.host_name}</p>
          <h1 className="text-3xl font-extrabold text-white mb-6">{profile.title}</h1>
          <div className="space-y-4 text-slate-300">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-fuchsia-400" />
              <span className="font-medium">{profile.duration_minutes} min</span>
            </div>
            <div className="flex items-center gap-3">
              <Video size={20} className="text-cyan-400" />
              <span className="font-medium">Web conferencing details provided upon confirmation.</span>
            </div>
          </div>
          {profile.description && (
            <p className="mt-8 text-slate-400 text-sm leading-relaxed">{profile.description}</p>
          )}
        </div>

        {/* Right Panel: Calendar & Slots */}
        <div className="w-full md:w-2/3 flex flex-col sm:flex-row">
          
          {/* Calendar */}
          <div className={`p-8 ${selectedDate ? 'w-full sm:w-1/2 border-r border-slate-800/50' : 'w-full'}`}>
            <h2 className="text-xl font-bold text-white mb-6">Select a Date & Time</h2>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-slate-200">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-1 rounded-full hover:bg-slate-800 text-cyan-400"><ChevronLeft size={20} /></button>
                <button onClick={nextMonth} className="p-1 rounded-full hover:bg-slate-800 text-cyan-400"><ChevronRight size={20} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="w-full sm:w-1/2 p-8 bg-slate-900/30">
              <p className="text-sm font-semibold text-slate-400 mb-4">{selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              
              {slotsLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-500"></div></div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No times available.</div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      {selectedTime === slot.start_time ? (
                        <div className="flex flex-col gap-3 p-4 bg-slate-800 rounded-xl border border-fuchsia-500/50 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center gap-2 text-fuchsia-400 font-bold">
                            <Clock size={16} /> {formatTime12h(slot.start_time)}
                          </div>
                          <form onSubmit={handleBook} className="space-y-3">
                            <input required type="text" placeholder="Your Name" value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500" />
                            <input required type="email" placeholder="Your Email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500" />
                            <div className="flex gap-2">
                              <Button variant="secondary" className="flex-1 py-2 text-xs" onClick={() => setSelectedTime(null)} type="button">Cancel</Button>
                              <Button className="flex-1 py-2 text-xs bg-fuchsia-600 hover:bg-fuchsia-500 text-white" disabled={bookingStatus === 'booking'} type="submit">
                                {bookingStatus === 'booking' ? 'Booking...' : 'Confirm'}
                              </Button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setSelectedTime(slot.start_time)}
                          className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-cyan-100 font-semibold hover:border-cyan-500 hover:text-cyan-400 transition"
                        >
                          {formatTime12h(slot.start_time)}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </Card>
    </div>
  );
}
