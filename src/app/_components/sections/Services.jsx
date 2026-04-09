import Data from "@data/sections/services.json";

const ServicesSection = () => {
  return (
    <>
        {/* services */}
        <div className="container-fluid">

        {/* row */}
        <div className="row">

            {/* col */}
            <div className="col-lg-12">

            {/* section title */}
            <div className="art-section-title">
                {/* title frame */}
                <div className="art-title-frame">
                {/* title */}
                <h4 dangerouslySetInnerHTML={{__html : Data.title}} />
                </div>
                {/* title frame end */}
            </div>
            {/* section title end */}

            </div>
            {/* col end */}
            
            {Data.items.map((item, key) => (
            <div className="col-lg-4 col-md-6" key={`services-item-${key}`}>

            {/* service card */}
            <div className="art-a art-service-card">
                {/* service image */}
                <div className="art-service-card-image">
                    <img src={item.image} alt={item.title} />
                </div>
                {/* service content */}
                <div className="art-service-card-content">
                    {/* title */}
                    <h5 className="art-service-card-title">{item.title}</h5>
                    {/* text */}
                    <p className="art-service-card-text">{item.text}</p>
                    {/* tags */}
                    <div className="art-service-card-tags">
                        {item.tags.map((tag, tagKey) => (
                        <span className="art-service-tag" key={`service-tag-${key}-${tagKey}`}>{tag}</span>
                        ))}
                    </div>
                </div>
                {/* service content end */}
            </div>
            {/* service card end */}

            </div>
            ))}

        </div>
        {/* row end */}

        </div>
        {/* services end */}
    </>
  );
};

export default ServicesSection;